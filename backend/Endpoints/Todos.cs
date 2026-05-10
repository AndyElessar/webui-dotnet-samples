using System.Globalization;

namespace Backend.Endpoints;

internal sealed record TodosData(
    TodoListItem[] Todos,
    string Query,
    string Filter,
    string ReturnPath,
    int TotalCount,
    int OpenCount,
    int CompletedCount,
    string ErrorMessage);

internal sealed record TodoEditData(
    bool Found,
    int Id,
    string Title,
    string Notes,
    bool Completed,
    string StatusLabel,
    string CreatedAt,
    string UpdatedAt,
    string ReturnPath,
    string ErrorMessage);

internal sealed record TodoListItem(
    int Id,
    string Title,
    string Notes,
    bool Completed,
    string StatusLabel,
    string CreatedAt,
    string UpdatedAt,
    string EditPath);

public static class Todos
{
    public static WebApplication MapTodos(this WebApplication app)
    {
        app.MapGet("/todos", (HttpContext context, TodoService todoService) =>
        {
            var query = GetQueryValue(context, "q");
            var filter = TodoService.NormalizeFilter(GetQueryValue(context, "filter"));
            var returnPath = BuildTodosPath(query, filter);
            var counts = todoService.GetCounts();
            var webuiApp = context.GetWebUiApplication();

            var state = JsonSerializer.Serialize(new TodosData(
                [.. todoService.Search(query, filter).Select(todo => ToListItem(todo, returnPath))],
                query,
                filter,
                returnPath,
                counts.Total,
                counts.Open,
                counts.Completed,
                GetQueryValue(context, "error")),
                AppJsonSerializerContext.Default.TodosData);

            return context.RenderWebUiResponse(webuiApp, state);
        });

        app.MapPost("/todos", async (HttpContext context, TodoService todoService) =>
        {
            var form = await context.Request.ReadFormAsync();
            var title = NormalizeText(form["title"].FirstOrDefault(), maxLength: 120);
            var notes = NormalizeText(form["notes"].FirstOrDefault(), maxLength: 500);
            var returnPath = GetLocalReturnPath(form["returnTo"].FirstOrDefault());

            if (title.Length == 0)
            {
                return Results.Redirect(AddError(returnPath, "Title is required."));
            }

            todoService.Add(title, notes);
            return Results.Redirect(returnPath);
        });

        app.MapGet("/todos/edit", (HttpContext context, TodoService todoService) =>
        {
            var webuiApp = context.GetWebUiApplication();
            var returnPath = GetLocalReturnPath(GetQueryValue(context, "returnTo"));
            var errorMessage = GetQueryValue(context, "error");
            var todo = TryGetId(context, out var id) ? todoService.GetById(id) : null;

            var state = JsonSerializer.Serialize(
                todo is null
                    ? new TodoEditData(false, id, string.Empty, string.Empty, false, string.Empty, string.Empty, string.Empty, returnPath, errorMessage.Length == 0 ? "Todo was not found." : errorMessage)
                    : ToEditData(todo, returnPath, errorMessage),
                AppJsonSerializerContext.Default.TodoEditData);

            return context.RenderWebUiResponse(webuiApp, state);
        });

        app.MapPost("/todos/edit", async (HttpContext context, TodoService todoService) =>
        {
            var form = await context.Request.ReadFormAsync();
            var returnPath = GetLocalReturnPath(form["returnTo"].FirstOrDefault());
            var title = NormalizeText(form["title"].FirstOrDefault(), maxLength: 120);
            var notes = NormalizeText(form["notes"].FirstOrDefault(), maxLength: 500);
            var completed = form.ContainsKey("completed");

            if (!int.TryParse(form["id"].FirstOrDefault(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var id))
            {
                return Results.Redirect(AddError("/todos", "Todo was not found."));
            }

            if (title.Length == 0)
            {
                return Results.Redirect(AddError(BuildEditPath(id, returnPath), "Title is required."));
            }

            if (!todoService.Update(id, title, notes, completed))
            {
                return Results.Redirect(AddError("/todos", "Todo was not found."));
            }

            return Results.Redirect(returnPath);
        });

        app.MapPost("/todos/delete", async (HttpContext context, TodoService todoService) =>
        {
            var form = await context.Request.ReadFormAsync();
            var returnPath = GetLocalReturnPath(form["returnTo"].FirstOrDefault());

            if (!int.TryParse(form["id"].FirstOrDefault(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var id)
                || !todoService.Delete(id))
            {
                return Results.Redirect(AddError(returnPath, "Todo was not found."));
            }

            return Results.Redirect(returnPath);
        });

        return app;
    }

    private static TodoListItem ToListItem(TodoItem todo, string returnPath)
    {
        return new TodoListItem(
            todo.Id,
            todo.Title,
            todo.Notes,
            todo.Completed,
            todo.Completed ? "Completed" : "Open",
            FormatDate(todo.CreatedAt),
            FormatDate(todo.UpdatedAt),
            BuildEditPath(todo.Id, returnPath));
    }

    private static TodoEditData ToEditData(TodoItem todo, string returnPath, string errorMessage)
    {
        return new TodoEditData(
            true,
            todo.Id,
            todo.Title,
            todo.Notes,
            todo.Completed,
            todo.Completed ? "Completed" : "Open",
            FormatDate(todo.CreatedAt),
            FormatDate(todo.UpdatedAt),
            returnPath,
            errorMessage);
    }

    private static bool TryGetId(HttpContext context, out int id)
    {
        return int.TryParse(GetQueryValue(context, "id"), NumberStyles.Integer, CultureInfo.InvariantCulture, out id);
    }

    private static string GetQueryValue(HttpContext context, string name)
    {
        return context.Request.Query[name].FirstOrDefault() ?? string.Empty;
    }

    private static string NormalizeText(string? value, int maxLength)
    {
        var text = (value ?? string.Empty).Trim();
        return text.Length <= maxLength ? text : text[..maxLength];
    }

    private static string FormatDate(DateTimeOffset value)
    {
        return value.ToLocalTime().ToString("MMM d, yyyy h:mm tt", CultureInfo.InvariantCulture);
    }

    private static string BuildTodosPath(string query, string filter)
    {
        var parameters = new List<KeyValuePair<string, string>>();
        var normalizedQuery = query.Trim();
        var normalizedFilter = TodoService.NormalizeFilter(filter);

        if (normalizedQuery.Length > 0)
        {
            parameters.Add(new KeyValuePair<string, string>("q", normalizedQuery));
        }

        if (normalizedFilter != "all")
        {
            parameters.Add(new KeyValuePair<string, string>("filter", normalizedFilter));
        }

        return AppendQueryString("/todos", parameters);
    }

    private static string BuildEditPath(int id, string returnPath)
    {
        return AppendQueryString("/todos/edit", new[]
        {
            new KeyValuePair<string, string>("id", id.ToString(CultureInfo.InvariantCulture)),
            new KeyValuePair<string, string>("returnTo", returnPath)
        });
    }

    private static string AddError(string path, string errorMessage)
    {
        var separator = path.Contains('?') ? '&' : '?';
        return $"{path}{separator}error={Uri.EscapeDataString(errorMessage)}";
    }

    private static string AppendQueryString(string path, IEnumerable<KeyValuePair<string, string>> parameters)
    {
        var queryString = string.Join("&", parameters.Select(parameter =>
            $"{Uri.EscapeDataString(parameter.Key)}={Uri.EscapeDataString(parameter.Value)}"));

        return queryString.Length == 0 ? path : $"{path}?{queryString}";
    }

    private static string GetLocalReturnPath(string? value)
    {
        return string.IsNullOrWhiteSpace(value) || !value.StartsWith("/", StringComparison.Ordinal) || value.StartsWith("//", StringComparison.Ordinal)
            ? "/todos"
            : value;
    }
}

namespace Backend.Endpoints.Todos;

static partial class Todos
{
    private static WebApplication MapQuery(this WebApplication app)
    {
        app.MapGet("/todos", (HttpContext context, TodosQueryRequest request, [FromServices] TodoService todoService) =>
        {
            var returnPath = BuildTodosPath(request.SearchText, request.Filter);
            var counts = todoService.GetCounts();
            var antiforgeryToken = context.GetAntiforgeryTokenData();

            var state = JsonSerializer.Serialize(new TodosQueryResponse(
                [.. todoService.Search(request.SearchText, request.Filter).Select(todo => ToListItem(todo, returnPath))],
                request.SearchText,
                ToFilterValue(request.Filter),
                returnPath,
                counts.Total,
                counts.Open,
                counts.Completed,
                request.Error ?? string.Empty,
                antiforgeryToken),
                AppJsonSerializerContext.Default.TodosQueryResponse);

            return context.RenderWebUiResponse(state);

            static string BuildTodosPath(string? searchText, TodosQueryFilter filter)
            {
                List<KeyValuePair<string, string>> parameters = [];
                var normalizedsearchText = searchText?.Trim();

                if (!string.IsNullOrEmpty(normalizedsearchText))
                {
                    parameters.Add(new("searchText", normalizedsearchText));
                }

                if (filter != TodosQueryFilter.All)
                {
                    parameters.Add(new("filter", filter.ToString().ToLowerInvariant()));
                }

                return Helper.AppendQueryString("/todos", parameters);
            }

            static string ToFilterValue(TodosQueryFilter filter) => filter.ToString().ToLowerInvariant();

            static TodoListItem ToListItem(TodoItem todo, string returnPath)
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
        });

        return app;
    }
}

internal sealed record TodosQueryRequest(
    string SearchText = "",
    TodosQueryFilter Filter = TodosQueryFilter.All,
    string Error = "")
{
    public static ValueTask<TodosQueryRequest?> BindAsync(HttpContext context)
    {
        var query = context.Request.Query;
        var filter = ParseFilter(query["filter"].ToString());

        return ValueTask.FromResult<TodosQueryRequest?>(new(
            query["searchText"].ToString(),
            filter,
            query["error"].ToString()));
    }

    private static TodosQueryFilter ParseFilter(string? value)
    {
        return Enum.TryParse<TodosQueryFilter>(value, ignoreCase: true, out var filter)
            && Enum.IsDefined(filter)
                ? filter
                : TodosQueryFilter.All;
    }
}

internal enum TodosQueryFilter
{
    All,
    Open,
    Completed
}

internal sealed record TodosQueryResponse(
    TodoListItem[] Todos,
    string SearchText,
    string Filter,
    string ReturnPath,
    int TotalCount,
    int OpenCount,
    int CompletedCount,
    string ErrorMessage,
    AntiforgeryTokenData AntiforgeryToken);

internal sealed record TodoListItem(
    int Id,
    string Title,
    string Notes,
    bool Completed,
    string StatusLabel,
    string CreatedAt,
    string UpdatedAt,
    string EditPath);

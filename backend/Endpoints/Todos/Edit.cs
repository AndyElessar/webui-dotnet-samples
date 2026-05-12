
using System.Globalization;

namespace Backend.Endpoints.Todos;

static partial class Todos
{
    private static WebApplication MapEdit(this WebApplication app)
    {
        app.MapGet("/todos/edit", (HttpContext context, [AsParameters] GetTodoEditRequest request, [FromServices] TodoService todoService) =>
        {
            var returnPath = GetLocalReturnPath(request.ReturnPath);
            var errorMessage = request.Error;
            var todo = request.Id.HasValue ? todoService.GetById(request.Id.Value) : null;
            var antiforgeryToken = context.GetAntiforgeryTokenData();

            var state = JsonSerializer.Serialize(
                todo is null
                    ? new TodoEditResponse(
                        false,
                        request.Id ?? 0,
                        string.Empty,
                        string.Empty,
                        false,
                        string.Empty,
                        string.Empty,
                        string.Empty,
                        returnPath,
                        string.IsNullOrEmpty(errorMessage) ? "Todo was not found." : errorMessage ?? string.Empty,
                        antiforgeryToken)
                    : ToEditData(todo, returnPath, errorMessage, antiforgeryToken),
                AppJsonSerializerContext.Default.TodoEditResponse);

            return context.RenderWebUiResponse(state);

            static TodoEditResponse ToEditData(TodoItem todo, string returnPath, string? errorMessage, AntiforgeryTokenData antiforgeryToken)
            {
                return new TodoEditResponse(
                    true,
                    todo.Id,
                    todo.Title,
                    todo.Notes,
                    todo.Completed,
                    todo.Completed ? "Completed" : "Open",
                    FormatDate(todo.CreatedAt),
                    FormatDate(todo.UpdatedAt),
                    returnPath,
                    errorMessage ?? string.Empty,
                    antiforgeryToken);
            }
        });

        app.MapPost("/todos/edit", async (HttpContext context, [AsParameters] PostTodoEditRequest request, [FromServices] TodoService todoService) =>
        {
            if (string.IsNullOrEmpty(request.Title))
            {
                return Results.Redirect(AddError(BuildEditPath(request.Id, request.ReturnPath), "Title is required."));
            }

            if (!todoService.Update(request.Id, request.Title, request.Notes, request.Completed == true))
            {
                return Results.Redirect(AddError("/todos", "Todo was not found."));
            }

            return Results.Redirect(request.ReturnPath);
        });

        return app;
    }
}

internal sealed record GetTodoEditRequest(
    [FromQuery] string ReturnPath,
    [FromQuery] int? Id,
    [FromQuery] string Error = "");

internal sealed record TodoEditResponse(
    bool Found,
    int Id,
    string Title,
    string Notes,
    bool Completed,
    string StatusLabel,
    string CreatedAt,
    string UpdatedAt,
    string ReturnPath,
    string? ErrorMessage,
    AntiforgeryTokenData AntiforgeryToken);

internal sealed record PostTodoEditRequest(
    [FromForm] int Id,
    [FromForm] string Title,
    [FromForm] string Notes,
    [FromForm] bool? Completed,
    [FromForm] string ReturnPath);

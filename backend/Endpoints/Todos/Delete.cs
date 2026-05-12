
namespace Backend.Endpoints.Todos;

static partial class Todos
{
    private static WebApplication MapDelete(this WebApplication app)
    {
        app.MapPost("/todos/delete", async (HttpContext context, [AsParameters] DeleteTodoRequest request, [FromServices] TodoService todoService) =>
        {
            var returnPath = GetLocalReturnPath(request.ReturnPath);

            if (!todoService.Delete(request.Id))
            {
                return Results.Redirect(AddError(returnPath, "Todo was not found."));
            }

            return Results.Redirect(returnPath);
        });

        return app;
    }
}

internal sealed record DeleteTodoRequest(
    [FromForm] int Id,
    [FromForm] string ReturnPath);
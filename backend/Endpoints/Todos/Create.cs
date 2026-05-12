namespace Backend.Endpoints.Todos;

static partial class Todos
{
    private static WebApplication MapCreate(this WebApplication app)
    {
        app.MapPost("/todos", async (HttpContext context, [AsParameters] TodoCreateRequest request, [FromServices] TodoService todoService) =>
        {
            if (string.IsNullOrWhiteSpace(request.Title))
            {
                return TypedResults.Redirect(AddError(request.ReturnPath, "Title is required."));
            }

            todoService.Add(request.Title, request.Notes);
            return TypedResults.Redirect(request.ReturnPath);
        });

        return app;
    }
}

internal sealed record TodoCreateRequest(
    [FromForm] string Title,
    [FromForm] string Notes,
    [FromForm] string ReturnPath);

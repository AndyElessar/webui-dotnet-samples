
namespace Backend.Endpoints;

internal sealed record IndexData(int Count);

public static class Index
{
    public static WebApplication MapIndex(this WebApplication app)
    {
        app.MapGet("/", (HttpContext context) =>
        {
            var state = JsonSerializer.Serialize(
                new IndexData(0),
                AppJsonSerializerContext.Default.IndexData);

            return context.RenderWebUiResponse(state);
        });

        return app;
    }
}
namespace Backend.Endpoints;

internal sealed record IndexData(string Route, int Count);

public static class Index
{
    public static WebApplication MapIndex(this WebApplication app)
    {
        app.MapGet("/", (HttpContext context) =>
        {
            var webuiApp = context.GetWebUiApplication();
            var route = context.GetRequestPath();

            var state = JsonSerializer.Serialize(
                new IndexData(route, 0), 
                AppJsonSerializerContext.Default.IndexData);
            
            return context.RenderWebUiResponse(webuiApp, state);
        });

        return app;
    }
}
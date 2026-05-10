
using System.Text.Json.Serialization;

namespace Backend;

internal static class Helper
{
    public static IResult RenderWebUiResponse(this HttpContext context, WebUiApplication webuiApp, string stateJson, string requestPath)
    {
        if (WantsJson(context.Request))
        {
            var inventory = context.Request.Headers["X-WebUI-Inventory"].FirstOrDefault() ?? string.Empty;
            var payload = webuiApp.RenderPartial(stateJson, requestPath, inventory);
            return Results.Content(payload, "application/json; charset=utf-8");
        }

        var html = webuiApp.RenderHtml(stateJson, requestPath);
        return Results.Content(html, "text/html; charset=utf-8");
    }

    private static bool WantsJson(HttpRequest request)
    {
        return request.GetTypedHeaders().Accept?.Any(header =>
            string.Equals(header.MediaType.Value, "application/json", StringComparison.OrdinalIgnoreCase)) == true;
    }

    public static WebUiApplication GetWebUiApplication(this HttpContext context)
    {
        return context.RequestServices.GetRequiredService<WebUiApplication>();
    }
}

[JsonSerializable(typeof(IndexData))]
[JsonSerializable(typeof(WeatherData))]
[JsonSourceGenerationOptions(JsonSerializerDefaults.Web)]
internal partial class AppJsonSerializerContext : JsonSerializerContext
{
}

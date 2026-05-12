
using System.Text.Json.Serialization;
using Backend.Endpoints.Todos;

namespace Backend;

internal static class Helper
{
    extension(HttpContext context)
    {
        public ContentHttpResult RenderWebUiResponse(string stateJson)
        {
            WebUiApplication webuiApp = context.RequestServices.GetRequiredService<WebUiApplication>();
            var requestPath = context.GetRequestPath();

            if (AcceptJson(context.Request))
            {
                var inventory = context.Request.Headers["X-WebUI-Inventory"].FirstOrDefault() ?? string.Empty;
                var payload = webuiApp.RenderPartial(stateJson, requestPath, inventory);
                return TypedResults.Content(payload, "application/json; charset=utf-8");
            }

            var html = webuiApp.RenderHtml(stateJson, requestPath);
            return TypedResults.Content(html, "text/html; charset=utf-8");
        }

        public string GetRequestPath()
        {
            return string.IsNullOrEmpty(context.Request.Path.Value) ? "/" : context.Request.Path.Value;
        }

        public AntiforgeryTokenData GetAntiforgeryTokenData()
        {
            var antiforgery = context.RequestServices.GetRequiredService<IAntiforgery>();
            var tokenSet = antiforgery.GetAndStoreTokens(context);
            return new AntiforgeryTokenData(tokenSet.FormFieldName, tokenSet.RequestToken ?? string.Empty);
        }
    }

    private static bool AcceptJson(HttpRequest request)
    {
        return request.GetTypedHeaders().Accept?.Any(header =>
            string.Equals(header.MediaType.Value, "application/json", StringComparison.OrdinalIgnoreCase)) == true;
    }

    public static string AppendQueryString(string path, params IEnumerable<KeyValuePair<string, string>> parameters)
    {
        if (parameters.Any())
        {
            return $"{path}?{ToQueryString(parameters)}";
        }

        return path;
    }

    private static string ToQueryString(IEnumerable<KeyValuePair<string, string>> parameters) =>
        string.Join("&", parameters.Select(p => $"{Uri.EscapeDataString(p.Key)}={Uri.EscapeDataString(p.Value)}"));
}

/// <summary>
/// Represents the antiforgery token information needed by the client to submit forms securely.
/// </summary>
/// <param name="FormFieldName">The name of the form field that will hold the antiforgery token.</param>
/// <param name="Token">The value of the antiforgery token.</param>
internal readonly record struct AntiforgeryTokenData(string FormFieldName, string Token);

[JsonSerializable(typeof(IndexData))]
[JsonSerializable(typeof(WeatherData))]
[JsonSerializable(typeof(TodosQueryRequest))]
[JsonSerializable(typeof(TodosQueryResponse))]
[JsonSerializable(typeof(TodoCreateRequest))]
[JsonSerializable(typeof(GetTodoEditRequest))]
[JsonSerializable(typeof(TodoEditResponse))]
[JsonSerializable(typeof(PostTodoEditRequest))]
[JsonSerializable(typeof(DeleteTodoRequest))]
[JsonSerializable(typeof(AntiforgeryTokenData))]
[JsonSourceGenerationOptions(JsonSerializerDefaults.Web)]
internal partial class AppJsonSerializerContext : JsonSerializerContext
{
}


namespace Backend.Endpoints;

internal sealed record WeatherData(
    WeatherForecast[] Forecasts,
    string ErrorMessage);

internal sealed record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}

public static class Weather
{
    private static readonly string[] summaries =
    [
        "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
    ];

    public static WebApplication MapWeather(this WebApplication app)
    {
        app.MapGet("/weather", (HttpContext context) =>
        {
            var state = JsonSerializer.Serialize(new WeatherData(
                CreateForecasts(summaries),
                string.Empty
            ), AppJsonSerializerContext.Default.WeatherData);

            return context.RenderWebUiResponse(state);
        });

        return app;
    }

    private static WeatherForecast[] CreateForecasts(string[] summaries)
    {
        return [.. Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))];
    }
}
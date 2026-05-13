
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
    public static WebApplication MapWeather(this WebApplication app)
    {
        app.MapGet("/weather", (HttpContext context, [FromServices] WeatherForecastService weatherForecastService) =>
        {
            var state = JsonSerializer.Serialize(new WeatherData(
                weatherForecastService.GetForecasts(),
                string.Empty
            ), AppJsonSerializerContext.Default.WeatherData);

            return context.RenderWebUiResponse(state);
        });

        return app;
    }
}

internal sealed class WeatherForecastService
{
    private readonly WeatherForecast[] forecasts;

    public WeatherForecastService()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        forecasts =
        [
            new(today, 22, "Clear start"),
            new(today.AddDays(1), 18, "Showers"),
            new(today.AddDays(2), 31, "Heat watch"),
            new(today.AddDays(3), 16, "Cool air"),
            new(today.AddDays(4), 26, "Bright finish")
        ];
    }

    public WeatherForecast[] GetForecasts() => [.. forecasts];
}
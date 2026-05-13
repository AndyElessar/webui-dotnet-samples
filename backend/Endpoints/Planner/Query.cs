using Backend.Endpoints.Todos;

namespace Backend.Endpoints.Planner;

static partial class Planner
{
    private static WebApplication MapQuery(this WebApplication app)
    {
        app.MapGet("/planner", (HttpContext context, [FromServices] TodoService todoService) =>
        {
            var allTodos = todoService.Search(null, TodosQueryFilter.All);
            var tasks = allTodos.Select(ToTask).ToArray();
            var forecasts = CreateForecasts();
            var completedCount = tasks.Count(task => task.Completed);
            var openCount = tasks.Length - completedCount;
            var generatedAt = DateTimeOffset.UtcNow;

            var state = JsonSerializer.Serialize(new PlannerQueryResponse(
                tasks,
                [.. tasks.Where(task => task.Slot == PlannerSlot.Morning)],
                [.. tasks.Where(task => task.Slot == PlannerSlot.Afternoon)],
                [.. tasks.Where(task => task.Slot == PlannerSlot.Evening)],
                [.. tasks.Where(task => task.Slot == PlannerSlot.Done)],
                forecasts,
                forecasts[0],
                tasks.Length,
                openCount,
                completedCount,
                tasks.Length == 0 ? 0 : (int)Math.Round(completedCount * 100d / tasks.Length),
                tasks.Length,
                0,
                "SSR snapshot ready",
                "idle",
                "Sync ready",
                "Move a task to sync it with the server.",
                FormatDate(generatedAt),
                "Server-rendered work plan, hydrated into a local planning surface."),
                AppJsonSerializerContext.Default.PlannerQueryResponse);

            return context.RenderWebUiResponse(state);
        });

        return app;
    }

    private static PlannerTaskItem ToTask(TodoItem todo)
    {
        return new PlannerTaskItem(
            todo.Id,
            todo.Title,
            todo.Notes,
            todo.Completed,
            GetStatusLabel(todo),
            FormatDate(todo.UpdatedAt),
            todo.PlannerSlot,
            todo.Priority,
            todo.WeatherFit);
    }

    private static PlannerForecastItem[] CreateForecasts()
    {
        var today = DateOnly.FromDateTime(DateTime.Today);

        return
        [
            new(0, "Today", FormatDate(today), 22, "Clear start", "Low", "focus", "morning"),
            new(1, "Tue", FormatDate(today.AddDays(1)), 18, "Showers", "Medium", "weather", "afternoon"),
            new(2, "Wed", FormatDate(today.AddDays(2)), 31, "Heat watch", "High", "heat", "morning"),
            new(3, "Thu", FormatDate(today.AddDays(3)), 16, "Cool air", "Low", "focus", "evening"),
            new(4, "Fri", FormatDate(today.AddDays(4)), 26, "Bright finish", "Medium", "energy", "afternoon")
        ];
    }
}

internal sealed record PlannerQueryResponse(
    PlannerTaskItem[] Tasks,
    PlannerTaskItem[] MorningTasks,
    PlannerTaskItem[] AfternoonTasks,
    PlannerTaskItem[] EveningTasks,
    PlannerTaskItem[] DoneTasks,
    PlannerForecastItem[] Forecasts,
    PlannerForecastItem SelectedForecast,
    int TotalCount,
    int OpenCount,
    int CompletedCount,
    int CompletionRate,
    int VisibleCount,
    int InteractionCount,
    string LastAction,
    string SaveNoticeState,
    string SaveNoticeLabel,
    string SaveNoticeMessage,
    string GeneratedAt,
    string HydrationMessage);

internal sealed record PlannerTaskItem(
    int Id,
    string Title,
    string Notes,
    bool Completed,
    string StatusLabel,
    string UpdatedAt,
    PlannerSlot Slot,
    TodoPriority Priority,
    string WeatherFit);

internal sealed record PlannerForecastItem(
    int Index,
    string Label,
    string DateLabel,
    int TemperatureC,
    string Summary,
    string RiskLevel,
    string Tone,
    string RecommendedSlot);
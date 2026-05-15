using System.Globalization;
using Backend.Endpoints.Todos;

namespace Backend.Endpoints.Planner;

public static partial class Planner
{
    public static WebApplication MapPlanner(this WebApplication app) =>
        app.MapQuery()
            .MapUpdate();

    private static string FormatDate(DateOnly value) =>
        value.ToString("MMM d", CultureInfo.InvariantCulture);

    private static string FormatDate(DateTimeOffset value) =>
        value.ToLocalTime().ToString("MMM d, h:mm tt", CultureInfo.InvariantCulture);

    private static string GetStatusLabel(TodoItem todo) =>
        todo.Completed ? "Completed" : "Not Completed";
}

[JsonConverter(typeof(PlannerSlotJsonConverter))]
internal enum PlannerSlot
{
    Morning,
    Afternoon,
    Evening,
    Done
}

internal sealed class PlannerSlotJsonConverter()
    : JsonStringEnumConverter<PlannerSlot>(JsonNamingPolicy.CamelCase);

[JsonConverter(typeof(JsonStringEnumConverter<PlannerFilter>))]
internal enum PlannerFilter
{
    All,
    Open,
    Completed,
    High
}

[JsonConverter(typeof(JsonStringEnumConverter<TodoPriority>))]
internal enum TodoPriority
{
    Normal,
    High
}
using System.Globalization;

namespace Backend.Endpoints.Todos;

public static partial class Todos
{
    public static WebApplication MapTodos(this WebApplication app) =>
        app.MapQuery()
            .MapCreate()
            .MapEdit()
            .MapDelete();

    private static string FormatDate(DateTimeOffset value)
    {
        return value.ToLocalTime().ToString("MMM d, yyyy h:mm tt", CultureInfo.InvariantCulture);
    }
    
    private static string BuildEditPath(int id, string returnPath)
    {
        return Helper.AppendQueryString(
            "/todos/edit",
            [new("id", id.ToString(CultureInfo.InvariantCulture)), new("returnPath", returnPath)]);
    }

    private static string AddError(string path, string errorMessage)
    {
        var separator = path.Contains('?') ? '&' : '?';
        return $"{path}{separator}error={Uri.EscapeDataString(errorMessage)}";
    }

    private static string GetLocalReturnPath(string? value)
    {
        return string.IsNullOrWhiteSpace(value) || !value.StartsWith('/') || value.StartsWith("//", StringComparison.Ordinal)
            ? "/todos"
            : value;
    }
}

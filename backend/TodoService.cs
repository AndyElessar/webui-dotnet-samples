namespace Backend;

internal sealed record TodoItem(
    int Id,
    string Title,
    string Notes,
    bool Completed,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

internal sealed class TodoService
{
    private readonly object syncRoot = new();
    private readonly List<TodoItem> todos = [];
    private int nextId = 1;

    public TodoService()
    {
        AddCore("Review WebUI routing", "Check how server-rendered routes and components compose.", completed: true);
        AddCore("Build todo CRUD", "Use in-memory C# collections for a compact demo.", completed: false);
        AddCore("Verify with Aspire", "Open the running app and exercise the todo flow.", completed: false);
    }

    public TodoItem[] Search(string query, string filter)
    {
        var normalizedQuery = query.Trim();
        var normalizedFilter = NormalizeFilter(filter);

        lock (syncRoot)
        {
            return [.. todos
                .Where(todo => MatchesFilter(todo, normalizedFilter))
                .Where(todo => MatchesQuery(todo, normalizedQuery))
                .OrderBy(todo => todo.Completed)
                .ThenByDescending(todo => todo.UpdatedAt)];
        }
    }

    public TodoItem? GetById(int id)
    {
        lock (syncRoot)
        {
            return todos.FirstOrDefault(todo => todo.Id == id);
        }
    }

    public TodoCounts GetCounts()
    {
        lock (syncRoot)
        {
            var completedCount = todos.Count(todo => todo.Completed);
            return new TodoCounts(todos.Count, todos.Count - completedCount, completedCount);
        }
    }

    public TodoItem Add(string title, string notes)
    {
        lock (syncRoot)
        {
            return AddCore(title, notes, completed: false);
        }
    }

    public bool Update(int id, string title, string notes, bool completed)
    {
        lock (syncRoot)
        {
            var index = todos.FindIndex(todo => todo.Id == id);
            if (index < 0)
            {
                return false;
            }

            todos[index] = todos[index] with
            {
                Title = title,
                Notes = notes,
                Completed = completed,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            return true;
        }
    }

    public bool Delete(int id)
    {
        lock (syncRoot)
        {
            return todos.RemoveAll(todo => todo.Id == id) > 0;
        }
    }

    private TodoItem AddCore(string title, string notes, bool completed)
    {
        var now = DateTimeOffset.UtcNow;
        var todo = new TodoItem(nextId++, title, notes, completed, now, now);
        todos.Add(todo);
        return todo;
    }

    private static bool MatchesFilter(TodoItem todo, string filter)
    {
        return filter switch
        {
            "open" => !todo.Completed,
            "completed" => todo.Completed,
            _ => true
        };
    }

    private static bool MatchesQuery(TodoItem todo, string query)
    {
        return query.Length == 0
            || todo.Title.Contains(query, StringComparison.OrdinalIgnoreCase)
            || todo.Notes.Contains(query, StringComparison.OrdinalIgnoreCase);
    }

    public static string NormalizeFilter(string filter)
    {
        return filter switch
        {
            "open" or "completed" => filter,
            _ => "all"
        };
    }
}

internal sealed record TodoCounts(int Total, int Open, int Completed);
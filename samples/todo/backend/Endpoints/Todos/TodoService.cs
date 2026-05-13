using Backend.Endpoints.Planner;

namespace Backend.Endpoints.Todos;

internal sealed class TodoService
{
    private readonly Lock _lock = new();
    private readonly List<TodoItem> todos = [];
    private int nextId = 1;

    public TodoService()
    {
        AddCore("Review WebUI routing", "Check how server-rendered routes and components compose.", completed: true, PlannerSlot.Done, TodoPriority.Normal, "Focus block");
        AddCore("Build todo CRUD", "Use in-memory C# collections for a compact demo.", completed: false, PlannerSlot.Afternoon, TodoPriority.High, "Field check");
        AddCore("Verify with Aspire", "Open the running app and exercise the todo flow.", completed: false, PlannerSlot.Evening, TodoPriority.Normal, "Light admin");
    }

    public TodoItem[] Search(string? query, TodosQueryFilter filter)
    {
        var normalizedQuery = query?.Trim() ?? string.Empty;

        lock (_lock)
        {
            return [.. todos
                .Where(todo => MatchesFilter(todo, filter))
                .Where(todo => MatchesQuery(todo, normalizedQuery))
                .OrderBy(todo => todo.Completed)
                .ThenByDescending(todo => todo.UpdatedAt)];
        }
    }

    public TodoItem? GetById(int id)
    {
        lock (_lock)
        {
            return todos.FirstOrDefault(todo => todo.Id == id);
        }
    }

    public TodoCounts GetCounts()
    {
        lock (_lock)
        {
            var completedCount = todos.Count(todo => todo.Completed);
            return new TodoCounts(todos.Count, todos.Count - completedCount, completedCount);
        }
    }
    public TodoItem Add(string title, string notes, PlannerSlot plannerSlot, TodoPriority priority, string weatherFit)
    {
        lock (_lock)
        {
            return AddCore(title, notes, plannerSlot == PlannerSlot.Done, plannerSlot, priority, NormalizeWeatherFit(weatherFit));
        }
    }

    public bool Update(int id, string title, string notes, bool completed, PlannerSlot plannerSlot, TodoPriority priority, string weatherFit)
    {
        lock (_lock)
        {
            var index = todos.FindIndex(todo => todo.Id == id);
            if (index < 0)
            {
                return false;
            }

            UpdateCore(index, title, notes, completed, plannerSlot, priority, weatherFit);
            return true;
        }
    }

    public bool Delete(int id)
    {
        lock (_lock)
        {
            return todos.RemoveAll(todo => todo.Id == id) > 0;
        }
    }

    public TodoItem? UpdatePlanner(int id, PlannerSlot slot, TodoPriority priority)
    {
        lock (_lock)
        {
            var index = todos.FindIndex(todo => todo.Id == id);
            if (index < 0)
            {
                return null;
            }

            todos[index] = todos[index] with
            {
                Completed = slot == PlannerSlot.Done,
                PlannerSlot = slot,
                Priority = priority,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            return todos[index];
        }
    }

    private TodoItem AddCore(string title, string notes, bool completed, PlannerSlot plannerSlot, TodoPriority priority, string weatherFit)
    {
        var now = DateTimeOffset.UtcNow;
        var todo = new TodoItem(nextId++, title, notes, completed, plannerSlot, priority, weatherFit, now, now);
        todos.Add(todo);
        return todo;
    }

    private void UpdateCore(int index, string title, string notes, bool completed, PlannerSlot plannerSlot, TodoPriority priority, string weatherFit)
    {
        var resolvedSlot =
            completed ? PlannerSlot.Done :
            plannerSlot == PlannerSlot.Done ? PlannerSlot.Morning :
            plannerSlot;

        todos[index] = todos[index] with
        {
            Title = title,
            Notes = notes,
            Completed = resolvedSlot == PlannerSlot.Done,
            PlannerSlot = resolvedSlot,
            Priority = priority,
            WeatherFit = NormalizeWeatherFit(weatherFit),
            UpdatedAt = DateTimeOffset.UtcNow
        };
    }

    private static string NormalizeWeatherFit(string weatherFit)
    {
        return string.IsNullOrWhiteSpace(weatherFit) ? "Focus block" : weatherFit.Trim();
    }

    private static bool MatchesFilter(TodoItem todo, TodosQueryFilter filter)
    {
        return filter switch
        {
            TodosQueryFilter.Open => !todo.Completed,
            TodosQueryFilter.Completed => todo.Completed,
            _ => true
        };
    }

    private static bool MatchesQuery(TodoItem todo, string query)
    {
        return string.IsNullOrEmpty(query)
            || todo.Title.Contains(query, StringComparison.OrdinalIgnoreCase)
            || todo.Notes.Contains(query, StringComparison.OrdinalIgnoreCase);
    }
}

internal sealed record TodoItem(
    int Id,
    string Title,
    string Notes,
    bool Completed,
    PlannerSlot PlannerSlot,
    TodoPriority Priority,
    string WeatherFit,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

internal sealed record TodoCounts(int Total, int Open, int Completed);

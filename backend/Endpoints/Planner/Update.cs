using Backend.Endpoints.Todos;

namespace Backend.Endpoints.Planner;

static partial class Planner
{
    private static WebApplication MapUpdate(this WebApplication app)
    {
        app.MapPost("/planner/todos/{id:int}",
            Results<BadRequest, NotFound, Ok<PlannerTodoUpdateResponse>> (int id, [FromBody] PlannerTodoUpdateRequest request, [FromServices] TodoService todoService) =>
            {
                if (request is null)
                {
                    return TypedResults.BadRequest();
                }

                var todo = todoService.UpdatePlanner(id, request.Slot, request.Priority);

                if (todo is null)
                {
                    return TypedResults.NotFound();
                }

                return TypedResults.Ok(new PlannerTodoUpdateResponse(ToTask(todo)));
            });

        return app;
    }
}

internal sealed record PlannerTodoUpdateRequest(PlannerSlot Slot, TodoPriority Priority);

internal sealed record PlannerTodoUpdateResponse(PlannerTaskItem Task);
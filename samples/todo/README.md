# Todo WebUI Demo

This sample shows how `microsoft/webui`, ASP.NET Core, and Aspire can be combined into a runnable todo app. The ASP.NET Core backend handles server-side rendering, form posts, JSON state, and static assets; the WebUI frontend provides hydrated client-side interactions; Aspire runs the local AppHost, backend resource, and dashboard.

## Running the App

Prerequisites:

- .NET 10 SDK
- Node.js and npm
- Aspire CLI

Start Aspire from this sample directory:

```bash
cd samples/todo
aspire start
```

The backend build also handles the frontend. If the WebUI CLI package has not been installed yet, the build runs `npm ci` in `frontend`, then runs `npm run build`, and finally copies the output into the backend `webui` static assets directory.

## App Features

### Todo CRUD

`/todos` is the server-rendered todo management page, demonstrating classic CRUD operations with `<form>`. Data is stored in memory.

Features include:

- Create todos with a title, notes, planner slot, priority, and weather fit.
- Search by title or notes.
- Filter the list by `All`, `Open`, or `Completed`.
- Edit a todo at `/todos/edit`, including title, notes, completed state, planner slot, priority, and weather fit.
- Delete todos from either the list page or edit page.
- View status counts for total, open, and done todos.

### Planner Board

`/planner` demonstrates an interactive planning board after WebUI hydration.

Features include:

- Display todos in Morning, Afternoon, Evening, and Done lanes.
- Search and filter locally by task, notes, or weather fit, with `All`, `Open`, `High`, and `Done` filters.
- Drag tasks between lanes, or use `Mark done` to move a task to the Done lane.
- Persist task moves by posting to `/planner/todos/{id}`, which updates the backend in-memory data.
- Use `Smart Plan` to redistribute open tasks based on the selected weather recommendation.
- Show the hydration message, interaction count, completion rate, and sync status.

### Weather Demo

`/weather` provides fixed weather forecast data to demonstrate server-rendered state and WebUI page data flow.

## Project Structure

```text
samples/todo/
|-- aspire/
|   `-- apphost/    # Orchestration
|-- backend/        # ASP.NET Core Minimal API backend, WebUI assets
`-- frontend/       # WebUI frontend components and assets
```

## Common Commands

```bash
# Start the full Aspire app from the sample directory
aspire start

# Type-check only the frontend TypeScript
cd frontend
npm run typecheck

# Build frontend WebUI assets
npm run build

# Build the backend; this also builds frontend assets
cd ../backend
dotnet build
```

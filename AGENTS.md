# Demo app for `microsoft/webui`

This project is a demo app for [microsoft/webui](https://github.com/microsoft/webui). Demonstrates server-side rendering and client-side hydration.

## Tech Stack

- backend: ASP.NET Core 10 Minimal API
- frontend: microsoft/webui
- orchestration: aspire

## Running the app

This repository can contain multiple sample apps, each with its own `aspire.config.json`.
Always run `aspire` CLI commands from the specific sample directory so Aspire resolves the intended AppHost.

```bash
# Run the todo sample in background
cd samples/todo
aspire start
```

Use #tool:browser to test app.

## Rules

- Minimal API should use `TypeResults` instead of `Results` to enable better OpenAPI generation.
- Backend should always be compatible with Native AOT for best performance. Which means use Source Generators as much as possible and avoid using reflection.
- When designing frontend components, use skill: `frontend-design`.
- When you want to: check current aspire apphosts status, use `aspire` CLI tool. Check skill: `aspire`.

## References

- [WebUI Framework - AI Reference](https://github.com/microsoft/webui/blob/main/docs/ai.md)
- [Minimal API Parameter Binding](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/parameter-binding?view=aspnetcore-10.0)
- [Minimal API Responses](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/minimal-apis/responses?view=aspnetcore-10.0)
- [System.Text.Json Source Generation](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/source-generation)

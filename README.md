# WebUI .NET Samples

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![.NET 10](https://img.shields.io/badge/.NET-10-512BD4)
![Sample](https://img.shields.io/badge/Type-Sample-0A7A3E)

This repository contains demo apps that show how `microsoft/webui`, ASP.NET Core, and Aspire can work together. The samples demonstrate ASP.NET Core serving server-side rendered WebUI pages, hydrating frontend components in the browser, and using Aspire to run and observe local application resources.

## Technical Highlights

- `microsoft/webui`: builds hydratable frontend experiences with WebUI templates and components.
- ASP.NET Core Minimal APIs: handle routing, form posts, JSON state serialization, and static WebUI assets.
- Aspire: provides the AppHost, resource startup, dashboard, logs, and local development workflow.
- Native AOT-friendly backend: the samples use `Minimal APIs` and `System.Text.Json` source generation to reach maximum performance.

## Repository Structure

```text
webui-dotnet-samples/
|-- samples/
|   `-- todo/
`-- shared/
    `-- service-defaults/   # Shared service defaults
```

## Samples

| Sample | Description |
| --- | --- |
| [`samples/todo`](samples/todo) | Todo and planner demo that shows SSR, hydration, form-based CRUD, client-side board interactions, and running an ASP.NET Core backend through Aspire. |

## Quick Start

Prerequisites:

- .NET 10 SDK
- Node.js and npm
- Aspire CLI

Run the todo sample:

```bash
cd samples/todo
aspire start
```

Aspire starts the AppHost and the `todo-backend` resource. Open the Aspire dashboard or the endpoint printed by the CLI to use the demo app.

## Package Notes

The repository currently includes a checked-in local package, `Microsoft.WebUI.0.0.12.nupkg`, because `Microsoft.WebUI` has not been published to NuGet yet.

- `NuGet.config` points to the repository root as a local package source.
- The included `.nupkg` was built locally for this sample repository.
- Once `Microsoft.WebUI` is published to NuGet, the sample will switch to the official NuGet package source instead of the checked-in package.

For details about running and using the todo app, see [`samples/todo/README.md`](samples/todo/README.md).

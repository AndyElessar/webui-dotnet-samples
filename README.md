# WebUI .NET Samples

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![.NET 10](https://img.shields.io/badge/.NET-10-512BD4)
![Sample](https://img.shields.io/badge/Type-Sample-0A7A3E)

This repository contains demo apps that show how [microsoft/webui](https://github.com/microsoft/webui), ASP.NET Core, and Aspire can work together.

## Technical Highlights

- microsoft/webui: builds hydratable frontend experiences with WebUI templates and components. Check [What is WebUI Framework?](https://microsoft.github.io/webui/guide/).
- ASP.NET Core Minimal APIs: handle routing, form posts, JSON state serialization, and static WebUI assets.
- Aspire: provides the AppHost, resource startup, dashboard, logs, and local development workflow.
- Native AOT-friendly backend: the samples use `Minimal APIs` and `System.Text.Json` source generation to reach maximum performance.

## Samples

| Sample | Description |
| --- | --- |
| [`samples/todo`](samples/todo) | Todo and planner demo that shows SSR, hydration, form-based CRUD, client-side board interactions, and running an ASP.NET Core backend through Aspire. |

## Quick Start

Prerequisites:

- .NET 10 SDK
- Node.js and npm
- Aspire CLI

Clone the repo and run the todo sample:

```bash
cd samples/todo
aspire start
```

For details about running and using the todo app, see [`samples/todo/README.md`](samples/todo/README.md).

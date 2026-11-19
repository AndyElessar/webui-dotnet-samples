var builder = DistributedApplication.CreateBuilder(args);

builder.AddDotnetProject("todo-backend", "../../backend/backend.csproj")
	.WithExternalHttpEndpoints();

builder.Build().Run();

var builder = DistributedApplication.CreateBuilder(args);

builder.AddProject<Projects.backend>("todo-backend")
	.WithExternalHttpEndpoints();

builder.Build().Run();

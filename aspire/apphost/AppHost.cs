var builder = DistributedApplication.CreateBuilder(args);

builder.AddProject<Projects.backend>("backend")
	.WithExternalHttpEndpoints();

builder.Build().Run();

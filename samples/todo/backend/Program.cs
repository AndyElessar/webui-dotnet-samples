using Backend.Endpoints.Todos;
using Backend.Endpoints.Planner;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

builder.Services.AddAntiforgery();

builder.Services.AddHsts(options =>
{
    options.IncludeSubDomains = true;
    options.MaxAge = TimeSpan.FromDays(180);
});

var webuiAssetsPath = Path.Combine(AppContext.BaseDirectory, "webui");
builder.Services.AddSingleton(new WebUiProtocolProvider(webuiAssetsPath));
builder.Services.AddScoped<WebUiApplication>();

builder.Services.AddSingleton<TodoService>();
builder.Services.AddSingleton<WeatherForecastService>();

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonSerializerContext.Default);
});

var app = builder.Build();

app.UseHttpsRedirection();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseAntiforgery();
app.UseAppSecurityHeaders();

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(webuiAssetsPath),
    RequestPath = ""
});
app.MapDefaultEndpoints();

app.MapIndex()
    .MapWeather()
    .MapPlanner()
    .MapTodos();

app.Run();

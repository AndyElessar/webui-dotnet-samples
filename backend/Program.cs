using Backend.Endpoints.Todos;
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
builder.Services.AddScoped<NonceProvider>();

builder.Services.AddSingleton<TodoService>();

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
    .MapTodos();

app.Run();

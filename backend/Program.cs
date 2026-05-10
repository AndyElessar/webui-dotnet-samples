using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

var webuiAssetsPath = Path.Combine(AppContext.BaseDirectory, "webui");
builder.Services.AddSingleton(new WebUiApplication(webuiAssetsPath));

var app = builder.Build();

app.UseHttpsRedirection();
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(webuiAssetsPath),
    RequestPath = ""
});
app.MapDefaultEndpoints();

app.MapIndex()
    .MapWeather();

app.Run();

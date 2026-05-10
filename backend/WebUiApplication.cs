
namespace Backend;

internal sealed class WebUiApplication : IDisposable
{
    private const string EntryTemplate = "index.html";
    private readonly WebUIHandler handler;
    private readonly byte[] protocol;

    public WebUiApplication(string assetsPath)
    {
        AssetsPath = assetsPath;

        if (!Directory.Exists(AssetsPath))
        {
            throw new DirectoryNotFoundException($"WebUI assets were not found at '{AssetsPath}'. Run the frontend build before starting the backend.");
        }

        var protocolPath = Path.Combine(AssetsPath, "protocol.bin");

        if (!File.Exists(protocolPath))
        {
            throw new FileNotFoundException("WebUI protocol.bin was not found.", protocolPath);
        }

        protocol = File.ReadAllBytes(protocolPath);

        try
        {
            handler = new WebUIHandler("webui");
        }
        catch (DllNotFoundException exception)
        {
            throw new InvalidOperationException(
                "Microsoft.WebUI could not load the native 'webui_ffi' runtime. Add the matching native runtime to the local package source or point WEBUI_LIB_PATH at a compatible webui_ffi binary.",
                exception);
        }
        catch (EntryPointNotFoundException exception)
        {
            throw new InvalidOperationException(
                "The resolved native library is not compatible with Microsoft.WebUI. Point WEBUI_LIB_PATH at a compatible webui_ffi binary instead of the Node webui.node addon.",
                exception);
        }
    }

    public string AssetsPath { get; }

    public string RenderHtml(string stateJson, string requestPath)
    {
        return handler.Render(protocol, stateJson, EntryTemplate, requestPath);
    }

    public string RenderPartial(string stateJson, string requestPath, string inventory)
    {
        return handler.RenderPartial(protocol, stateJson, EntryTemplate, requestPath, inventory);
    }

    public void Dispose()
    {
        handler.Dispose();
    }
}

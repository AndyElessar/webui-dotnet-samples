
namespace Backend;

internal sealed class WebUiProtocolProvider
{
    public byte[] Protocol { get; }

    public WebUiProtocolProvider(string assetsPath)
    {
        if (!Directory.Exists(assetsPath))
        {
            throw new DirectoryNotFoundException($"WebUI assets were not found at '{assetsPath}'. Run the frontend build before starting the backend.");
        }

        var protocolPath = Path.Combine(assetsPath, "protocol.bin");

        if (!File.Exists(protocolPath))
        {
            throw new FileNotFoundException("WebUI protocol.bin was not found.", protocolPath);
        }

        Protocol = File.ReadAllBytes(protocolPath);
    }
}

internal sealed class WebUiApplication : IDisposable
{
    private const string EntryTemplate = "index.html";
    private readonly WebUiProtocolProvider protocolProvider;

    private readonly WebUIHandler handler;
    private readonly NonceProvider nonceProvider;

    public WebUiApplication(WebUiProtocolProvider webUiProtocolProvider, NonceProvider nonceProvider)
    {
        protocolProvider = webUiProtocolProvider;
        this.nonceProvider = nonceProvider;
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

    private void SetNonce()
    {
        handler.SetNonce(nonceProvider.Nonce);
    }

    public string RenderHtml(string stateJson, string requestPath)
    {
        SetNonce();
        return handler.Render(protocolProvider.Protocol, stateJson, EntryTemplate, requestPath);
    }

    public string RenderPartial(string stateJson, string requestPath, string inventory)
    {
        SetNonce();
        return handler.RenderPartial(protocolProvider.Protocol, stateJson, EntryTemplate, requestPath, inventory);
    }

    public void Dispose()
    {
        handler.Dispose();
    }
}

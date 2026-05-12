using System.Security.Cryptography;

namespace Backend;

internal static class SecurityHeadersExtensions
{
    private const string ContentSecurityPolicy = "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; font-src 'self' data:; object-src 'none'; style-src 'self' 'unsafe-inline'; connect-src 'self'; script-src 'self' ";

    public static IApplicationBuilder UseAppSecurityHeaders(this IApplicationBuilder app)
    {
        return app.Use(async (context, next) =>
        {
            context.Response.OnStarting(static state =>
            {
                var httpContext = (HttpContext)state;
                var headers = httpContext.Response.Headers;
                var nonce = httpContext.RequestServices.GetRequiredService<NonceProvider>().Nonce;

                headers.ContentSecurityPolicy = ContentSecurityPolicy + $"'nonce-{nonce}';";
                headers["Referrer-Policy"] = "no-referrer";
                headers.XContentTypeOptions = "nosniff";
                headers.XFrameOptions = "DENY";
                headers["Permissions-Policy"] = "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()";
                headers["Cross-Origin-Opener-Policy"] = "same-origin";
                headers["Cross-Origin-Resource-Policy"] = "same-origin";
                headers["X-Permitted-Cross-Domain-Policies"] = "none";

                return Task.CompletedTask;
            }, context);

            await next();
        });
    }
}

internal sealed class NonceProvider
{
    public string Nonce { get; private set; }

    public NonceProvider()
    {
        using var rng = RandomNumberGenerator.Create();
        var nonceBytes = new byte[32];
        rng.GetBytes(nonceBytes);
        Nonce = Convert.ToBase64String(nonceBytes);
    }
}

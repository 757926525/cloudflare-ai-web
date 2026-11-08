import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!code) {
    // If no code, initiate OAuth flow by redirecting to GitHub
    if (!clientId) {
      return new NextResponse(
        "<html><body><script>alert('GITHUB_CLIENT_ID is not configured on the server. Please enter a Personal Access Token (PAT) directly in Settings.');window.close();</script></body></html>",
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }
    const redirectUri = `${new URL(request.url).origin}/api/github/oauth`;
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,read:user&redirect_uri=${encodeURIComponent(
      redirectUri
    )}`;
    return NextResponse.redirect(githubAuthUrl);
  }

  // Handle callback with code
  if (!clientId || !clientSecret) {
    return new NextResponse(
      "<html><body><script>alert('GitHub OAuth Client ID / Secret not configured.');window.close();</script></body></html>",
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.access_token) {
      // Send token back to window opener and close popup
      return new NextResponse(
        `<html><body><script>
          window.opener.postMessage({ type: 'GITHUB_AUTH_SUCCESS', token: '${tokenData.access_token}' }, '*');
          window.close();
        </script><p>Authorization successful! You can close this window.</p></body></html>`,
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    return new NextResponse(
      `<html><body><script>alert('Failed to obtain GitHub token: ${tokenData.error_description || "Unknown error"}');window.close();</script></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (err: any) {
    return new NextResponse(
      `<html><body><script>alert('OAuth exchange failed: ${err.message}');window.close();</script></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}

import { randomBytes } from "node:crypto";

import {
  configuration,
  cookie,
  cookieState,
  validState,
  secureHeaders,
  errorResponse,
  githubJson,
  scriptJSON
} from "../lib/oauth.mjs";

export default async function handler(request) {
  if (request.method !== "GET") {
    return errorResponse("Method not allowed.", 405);
  }

  try {
    const config = configuration();
    const url = new URL(request.url);

    if (url.searchParams.has("error")) {
      return errorResponse("GitHub authorization was cancelled.");
    }

    const state = url.searchParams.get("state");
    const expectedState = cookieState(request);
    const code = url.searchParams.get("code");

    if (!code || !validState(state, expectedState)) {
      return errorResponse(
        "This login attempt expired or was invalid. Close this window and try again."
      );
    }

    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: config.callback
        }),
        signal: AbortSignal.timeout(10000)
      }
    );

    if (!tokenResponse.ok) {
      return errorResponse("GitHub could not complete this login.", 502);
    }

    const tokenData = await tokenResponse.json();
    const token = tokenData.access_token;

    if (!token) {
      return errorResponse("GitHub did not return a valid login token.", 401);
    }

    const user = await githubJson(
      "https://api.github.com/user",
      token
    );

    if (!config.users.includes(user.login.toLowerCase())) {
      return errorResponse(
        "This GitHub account is not permitted to edit the website.",
        403
      );
    }

    const repository = await githubJson(
      `https://api.github.com/repos/${config.repository}`,
      token
    );

    if (!repository.permissions?.push) {
      return errorResponse(
        "This account does not have write access to the website repository.",
        403
      );
    }

    const nonce = randomBytes(24).toString("base64");

    const message =
      "authorization:github:success:" +
      JSON.stringify({ token, provider: "github" });

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex,nofollow">
  <title>Completing website login</title>
</head>
<body>
  <p>Completing your secure website login…</p>
  <script nonce="${nonce}">
    const allowedOrigin = ${scriptJSON(config.origin)};
    const result = ${scriptJSON(message)};

    if (!window.opener) {
      document.body.textContent =
        "Open the login window from the website editing portal.";
    } else {
      function receive(event) {
        if (event.origin !== allowedOrigin) return;
        if (event.source !== window.opener) return;

        window.removeEventListener("message", receive);
        window.opener.postMessage(result, allowedOrigin);

        setTimeout(() => window.close(), 500);
      }

      window.addEventListener("message", receive);
      window.opener.postMessage("authorizing:github", allowedOrigin);
    }
  </script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: secureHeaders({
        "Content-Type": "text/html; charset=utf-8",
        "Set-Cookie": cookie("", 0),
        "Content-Security-Policy":
          `default-src 'none'; script-src 'nonce-${nonce}'; ` +
          "base-uri 'none'; frame-ancestors 'none'"
      })
    });
  } catch {
    return errorResponse(
      "Login could not complete. Check the account permissions and Netlify configuration, then try again.",
      500
    );
  }
}
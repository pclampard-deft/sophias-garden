import {
  configuration,
  randomState,
  cookie,
  secureHeaders,
  errorResponse
} from "../lib/oauth.mjs";

export default async function handler(request) {
  if (request.method !== "GET") {
    return errorResponse("Method not allowed.", 405);
  }

  try {
    const config = configuration();
    const state = randomState();

    const authorize = new URL(
      "https://github.com/login/oauth/authorize"
    );

    authorize.searchParams.set("client_id", config.clientId);
    authorize.searchParams.set("redirect_uri", config.callback);
    authorize.searchParams.set("scope", "public_repo");
    authorize.searchParams.set("state", state);
    authorize.searchParams.set("allow_signup", "false");

    return new Response(null, {
      status: 302,
      headers: secureHeaders({
        "Location": authorize.href,
        "Set-Cookie": cookie(state)
      })
    });
  } catch {
    return errorResponse(
      "CMS login is not configured. Check the Netlify environment variables.",
      500
    );
  }
}
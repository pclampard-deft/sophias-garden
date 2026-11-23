import { randomBytes, timingSafeEqual } from "node:crypto";

export function configuration() {
  const origin = new URL(process.env.SITE_URL).origin;

  if (!origin.startsWith("https://")) {
    throw new Error("SITE_URL must use HTTPS.");
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const repository = process.env.GITHUB_REPO;

  const users = (process.env.GITHUB_ALLOWED_USERS || "")
    .split(",")
    .map(user => user.trim().toLowerCase())
    .filter(Boolean);

  if (!clientId || !clientSecret || !repository || !users.length) {
    throw new Error("Missing CMS authentication configuration.");
  }

  return {
    origin,
    clientId,
    clientSecret,
    repository,
    users,
    callback: `${origin}/.netlify/functions/callback`
  };
}

export function randomState() {
  return randomBytes(32).toString("hex");
}

export function cookie(value, maxAge = 600) {
  return [
    `__Host-sg_oauth=${value}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAge}`
  ].join("; ");
}

export function cookieState(request) {
  const header = request.headers.get("cookie") || "";

  const match = header.match(
    /(?:^|;\s*)__Host-sg_oauth=([a-f0-9]{64})(?:;|$)/
  );

  return match ? match[1] : "";
}

export function validState(actual, expected) {
  if (!/^[a-f0-9]{64}$/.test(actual || "")) return false;
  if (!/^[a-f0-9]{64}$/.test(expected || "")) return false;

  return timingSafeEqual(
    Buffer.from(actual),
    Buffer.from(expected)
  );
}

export function secureHeaders(extra = {}) {
  return {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow",
    ...extra
  };
}

export function errorResponse(message, status = 400) {
  return new Response(message, {
    status,
    headers: secureHeaders({
      "Content-Type": "text/plain; charset=utf-8",
      "Set-Cookie": cookie("", 0)
    })
  });
}

export async function githubJson(url, token) {
  const response = await fetch(url, {
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "User-Agent": "Sophias-Garden-CMS",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    throw new Error("GitHub permission check failed.");
  }

  return response.json();
}

export function scriptJSON(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
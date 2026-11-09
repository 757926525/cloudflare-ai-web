interface PagesEnv {
  APP_PASSWORD?: string;
}

interface PagesContext {
  request: Request;
  env: PagesEnv;
  next: () => Promise<Response>;
}

export async function onRequest({ request, env, next }: PagesContext) {
  // Pages root middleware runs for static assets and page routes too; only protect APIs.
  if (!new URL(request.url).pathname.startsWith("/api/")) {
    return next();
  }

  if (env.APP_PASSWORD && request.headers.get("Authorization") !== env.APP_PASSWORD) {
    return new Response("Unauthorized", { status: 401 });
  }

  return next();
}

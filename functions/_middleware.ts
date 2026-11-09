export async function onRequest({ request, env, next }) {
  const authHeader = request.headers.get("Authorization");

  if (!env.APP_PASSWORD) {
    return next();
  }

  if (authHeader !== env.APP_PASSWORD) {
    return new Response("Unauthorized", { status: 401 });
  }

  return next();
}

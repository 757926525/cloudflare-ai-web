export async function onRequest({ request, env, next }) {
  if (!env.APP_PASSWORD) {
    return next();
  }

  const authorization = request.headers.get("Authorization");
  if (authorization !== env.APP_PASSWORD) {
    return new Response("Unauthorized", { status: 401 });
  }

  return next();
}

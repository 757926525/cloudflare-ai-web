export const dynamic = "force-static";

export async function GET() {
  return Response.json(
    { error: "Use the Cloudflare Pages Function for this endpoint." },
    { status: 501 },
  );
}

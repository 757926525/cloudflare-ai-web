// The Next.js route exists only to satisfy static export. Runtime POST requests
// are handled by the matching Cloudflare Pages Function in functions/api/chat.ts.
export const dynamic = "force-static";

export async function GET() {
  return Response.json(
    { error: "Use the Cloudflare Pages Function for this endpoint." },
    { status: 501 },
  );
}

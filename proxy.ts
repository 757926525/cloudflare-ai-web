import { NextResponse, type NextRequest } from "next/server";

// Cloudflare Pages handles API authentication in functions/_middleware.ts.
// This no-op proxy export is required by Next.js 16's proxy file convention;
// it intentionally does not apply server-side routing to the static export.
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

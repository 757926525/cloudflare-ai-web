import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const appPassword = process.env.APP_PASSWORD;

    // If no APP_PASSWORD is configured, admin is accessible by default or empty password
    if (!appPassword) {
      return NextResponse.json({ authenticated: true, isAdmin: true });
    }

    if (password === appPassword) {
      return NextResponse.json({ authenticated: true, isAdmin: true });
    }

    return NextResponse.json({ authenticated: false, error: "Invalid password" }, { status: 401 });
  } catch (_error) {
    return NextResponse.json({ authenticated: false, error: "Bad request" }, { status: 400 });
  }
}

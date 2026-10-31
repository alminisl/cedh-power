import type { NextRequest } from "next/server";
import { createClient, type User } from "@supabase/supabase-js";
import { isAdminEmail } from "./admin";

// Verifies the caller's Supabase access token server-side.
export async function getRequestUser(request: NextRequest): Promise<User | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return null;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data, error } = await supabase.auth.getUser(token);
  return error ? null : data.user;
}

export async function requireAdmin(request: NextRequest): Promise<boolean> {
  const user = await getRequestUser(request);
  return isAdminEmail(user?.email);
}

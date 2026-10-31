import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminEmail } from "./admin";

// Verifies the caller's Supabase access token server-side and checks it belongs to an admin.
export async function requireAdmin(request: NextRequest): Promise<boolean> {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return false;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data, error } = await supabase.auth.getUser(token);
  return !error && isAdminEmail(data.user?.email);
}

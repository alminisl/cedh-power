import { supabase } from "./supabase";

// Authorization header carrying the signed-in user's Supabase access token (for admin API routes).
export async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

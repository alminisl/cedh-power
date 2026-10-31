// Shared by the UI (to show admin controls) and the API (to actually enforce them).
export const ADMIN_EMAILS = ["oromier@gmail.com", "mansbredelius@gmail.com"];

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email);
}

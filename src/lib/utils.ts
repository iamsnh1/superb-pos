import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
}

/** Format phone for wa.me: Indian 10-digit needs 91 prefix */
export function formatPhoneForWhatsApp(raw: string): string {
  const digits = raw?.replace(/\D/g, "") || "";
  if (!digits) return "";
  if (digits.length === 10 && /^[6-9]/.test(digits)) return "91" + digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
}

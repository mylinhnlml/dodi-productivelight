// Update these two values once the app is live on the App Store
export const APP_IS_LIVE = false;
export const APP_STORE_URL = "https://apps.apple.com/app/idXXXXXXXXXX"; // TODO: replace with real App ID

export const WEB_APP_URL =
  typeof window !== "undefined" ? window.location.origin : "https://dodi-productivelight.lovable.app";

export function getShareUrl(refCode: string): string {
  const base = APP_IS_LIVE ? APP_STORE_URL : WEB_APP_URL;
  return `${base}?ref=${refCode}`;
}

export function getShareMessage(refCode: string): string {
  return `I've been using Dodi to feel calmer and more on top of my day ☀️ Try it — use my link and we both get a surprise sticker pack!\n\n${getShareUrl(refCode)}`;
}

// Cloudflare Pages Function
// This is an empty worker that lets Cloudflare Pages serve static files directly

export async function onRequest(context) {
  // Just pass through to the static asset handler
  return context.next();
}

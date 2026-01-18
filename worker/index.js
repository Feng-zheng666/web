// Simple Cloudflare Worker that serves static assets
export default {
  async fetch(request, env, ctx) {
    // Use the static assets handler
    return env.ASSETS.fetch(request);
  }
};

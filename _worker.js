// Cloudflare Worker for static site
// This worker serves static files from the site

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Serve static files directly
    if (url.pathname.includes('.')) {
      return env.ASSETS.fetch(request);
    }
    
    // For all other routes, serve index.html
    return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
  }
};

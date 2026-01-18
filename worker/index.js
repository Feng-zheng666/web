// Cloudflare Worker for SPA with static assets support
export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const pathname = url.pathname;
      
      // Handle CORS preflight requests
      if (request.method === 'OPTIONS') {
        return handleCorsPreflight(request);
      }
      
      // Handle API routes (if any) - currently none, but keeping structure
      if (pathname.startsWith('/api/')) {
        return handleApiRequest(request, env, ctx);
      }
      
      // Serve static assets directly from assets binding
      // Check if this is a request for a static file
      const isStaticFile = await isStaticAssetRequest(pathname, request, env);
      
      if (isStaticFile) {
        // Let the assets binding handle static files
        return env.ASSETS.fetch(request);
      }
      
      // For all other routes (including root), serve index.html for SPA routing
      return serveIndexHtml(env);
      
    } catch (error) {
      // Error handling
      console.error('Worker error:', error);
      return new Response('Internal Server Error', {
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};

// Handle CORS preflight requests
function handleCorsPreflight(request) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD',
      'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || '*',
      'Access-Control-Max-Age': '86400'
    }
  });
}

// Handle API requests (placeholder for future API endpoints)
async function handleApiRequest(request, env, ctx) {
  // Currently no API endpoints, return 404
  return new Response('Not Found', {
    status: 404,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// Check if the request is for a static asset
async function isStaticAssetRequest(pathname, request, env) {
  // Common static file extensions
  const staticExtensions = [
    '.html', '.css', '.js', '.json', '.txt', '.md',
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
    '.woff', '.woff2', '.ttf', '.eot',
    '.mp3', '.mp4', '.webm', '.ogg',
    '.pdf', '.zip', '.tar', '.gz'
  ];
  
  // Check if path has a file extension
  const hasExtension = staticExtensions.some(ext => pathname.toLowerCase().endsWith(ext));
  
  if (hasExtension) {
    return true;
  }
  

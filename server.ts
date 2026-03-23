import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import httpProxy from 'http-proxy';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;
  const proxy = httpProxy.createProxyServer({});

  // Proxy for MCP to avoid CORS issues
  // Pattern: /proxy/http/host/path... or /proxy/https/host/path...
  app.use('/proxy/:protocol/:host', (req, res) => {
    const { protocol, host } = req.params;
    const target = `${protocol}://${host}`;
    
    // The remaining path is in req.url (relative to the mount point /proxy/:protocol/:host)
    // We need to preserve it.
    
    proxy.web(req, res, {
      target,
      changeOrigin: true,
      secure: false,
    }, (err) => {
      console.error('Proxy error:', err);
      if (!res.headersSent) {
        res.status(500).send('Proxy error');
      }
    });
  });

  // Add CORS headers to all proxy responses
  proxy.on('proxyRes', (proxyRes, req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

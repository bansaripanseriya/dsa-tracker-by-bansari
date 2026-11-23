import { fileURLToPath } from 'url';
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import react from '@vitejs/plugin-react';

// Problem data and scoring live in ../shared so the server can use them too.
const sharedDir = fileURLToPath(new URL('../shared', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': sharedDir
    }
  },
  server: {
    port: 5173,
    fs: {
      // Vite only serves files inside client/ by default; allow ../shared as well.
      allow: [searchForWorkspaceRoot(process.cwd()), sharedDir]
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  }
});

import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import { defineConfig } from 'vite';

function getGitInfo() {
  try {
    const hash = execSync('git rev-parse --short HEAD').toString().trim();
    const count = execSync('git rev-list --count HEAD').toString().trim();
    return { hash, count: parseInt(count, 10) };
  } catch {
    return { hash: 'dev', count: 0 };
  }
}

const git = getGitInfo();

// https://vite.dev/config/
export default defineConfig({
  define: {
    __GIT_HASH__: JSON.stringify(git.hash),
    __GIT_COMMITS__: git.count,
  },
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

import build from '@hono/vite-build/cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    build({
      minify: true,
      emptyOutDir: true
    }),
    devServer({
      adapter,
      entry: 'src/index.tsx'
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 5000,
    hmr: {
      port: 5001
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      external: ['__STATIC_CONTENT_MANIFEST']
    }
  }
})

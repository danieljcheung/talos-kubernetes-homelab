import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const siteRoot = path.dirname(fileURLToPath(import.meta.url))
const cozyRoot = path.resolve(siteRoot, 'cozy')

export default defineConfig({
  root: cozyRoot,
  plugins: [react()],
  build: {
    outDir: path.resolve(siteRoot, 'dist-cozy'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'assets/app.css'
          }
          return 'assets/[name][extname]'
        }
      }
    }
  }
})

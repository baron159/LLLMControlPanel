import { defineConfig } from 'vite'
import { resolve } from 'path';
import { copyFileSync } from 'fs';

export default defineConfig({
  plugins: [
    {
      name: 'copy-manifest',
      writeBundle() {
        copyFileSync('manifest.json', 'dist/manifest.json');
      }
    }
  ],
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        background: resolve(__dirname, 'src/background/tiny-background.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
        api: resolve(__dirname, 'src/api.js'),
        'onnx-worker': resolve(__dirname, 'src/workers/onnx-worker.ts')
      },
      output: {
        assetFileNames: 'assets/[name].[ext]',
        chunkFileNames: '[name].js',
        entryFileNames: '[name].js',
        manualChunks: {
          'onnx-runtime': ['onnxruntime-web']
        }
      },
      external: ['chrome']
    }
  },
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web']
  }
}) 
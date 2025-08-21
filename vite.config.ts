import { defineConfig } from 'vite'
import { resolve } from 'path';
import { copyFileSync, readFileSync, writeFileSync } from 'fs';

// Version incrementing plugin
function versionIncrementPlugin() {
  return {
    name: 'version-increment',
    buildStart() {
      try {
        // Read current manifest.json
        const manifestContent = readFileSync('manifest.json', 'utf-8');
        const manifest = JSON.parse(manifestContent);
        
        // Parse current version (e.g., "1.0.0.1001")
        const versionParts = manifest.version.split('.');
        const lastNumber = parseInt(versionParts[versionParts.length - 1]);
        const newLastNumber = lastNumber + 1;
        
        // Create new version
        versionParts[versionParts.length - 1] = newLastNumber.toString();
        const newVersion = versionParts.join('.');
        
        // Store old version for logging
        const oldVersion = manifest.version;
        
        // Update manifest.json
        manifest.version = newVersion;
        writeFileSync('manifest.json', JSON.stringify(manifest, null, 2));
        
        // Update package.json version as well
        const packageContent = readFileSync('package.json', 'utf-8');
        const packageJson = JSON.parse(packageContent);
        packageJson.version = newVersion;
        writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
        
        console.log(`Version incremented from ${oldVersion} to ${newVersion}`);
      } catch (error) {
        console.error('Error incrementing version:', error);
      }
    }
  };
}

export default defineConfig({
  plugins: [
    versionIncrementPlugin(),
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
        background: resolve(__dirname, 'src/background/sw.ts'),
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
  },
  define: {
    // Ensure global variables are available in service worker context
    global: 'globalThis'
  },
  // Ensure ES modules work properly in service worker
  esbuild: {
    target: 'es2020'
  }
}) 
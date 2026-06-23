import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      // Modern browsers only → smaller, faster output with no legacy transpilation.
      target: 'es2020',
      cssCodeSplit: true,
      // Split rarely-changing vendor libraries into their own long-cached chunks so a
      // code change doesn't force users to re-download React/motion/etc.
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            motion: ['motion'],
            icons: ['lucide-react'],
          },
        },
      },
      // Skip the expensive gzip-size report during build.
      reportCompressedSize: false,
      chunkSizeWarningLimit: 1200,
    },
  };
});

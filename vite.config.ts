import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

const GUARDIAN_API_ORIGIN = 'https://content.guardianapis.com';

function createGuardianProxy(apiKey: string) {
  return {
    target: GUARDIAN_API_ORIGIN,
    changeOrigin: true,
    secure: true,
    rewrite(path: string) {
      const upstreamUrl = new URL(
        path.replace(/^\/guardian-api/, ''),
        GUARDIAN_API_ORIGIN,
      );

      if (apiKey) {
        upstreamUrl.searchParams.set('api-key', apiKey);
      }

      return `${upstreamUrl.pathname}${upstreamUrl.search}`;
    },
  };
}

export default defineConfig(({ mode }) => {
  const { GUARDIAN_API_KEY = '' } = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/guardian-api': createGuardianProxy(GUARDIAN_API_KEY),
      },
    },
    preview: {
      port: 4173,
      proxy: {
        '/guardian-api': createGuardianProxy(GUARDIAN_API_KEY),
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: './src/test/setup.ts',
      css: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
      },
    },
  };
});

import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api/groq': {
          target: 'https://api.groq.com/openai/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/groq/, ''),
        },
        '/api/moonshot': {
          target: 'https://api.moonshot.cn/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/moonshot/, ''),
        },
        '/api/openrouter': {
          target: 'https://openrouter.ai/api/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/openrouter/, ''),
        },
        '/api/nvidia': {
          target: 'https://integrate.api.nvidia.com/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/nvidia/, ''),
          secure: false,
          headers: {
            'Origin': 'https://integrate.api.nvidia.com'
          }
        },
        '/api/glm': {
          target: 'https://api.us-west-2.modal.direct/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/glm/, '')
        },
        '/api/openai': {
          target: 'https://api.openai.com/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/openai/, '')
        }
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});

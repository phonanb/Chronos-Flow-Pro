
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Change this to your repository name if deploying to https://<username>.github.io/<repo-name>/
  base: './',
});

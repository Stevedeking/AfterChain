import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';

// https://vite.dev/config/
export default defineConfig({
	root: 'src/react-app',
	plugins: [
		react(),
		tailwindcss(),
		cloudflare({ configPath: '../../wrangler.jsonc' }),
	],
	build: {
		outDir: '../../dist/client',
		emptyOutDir: true,
	},
	server: {
		port: 8000,
		host: true,
	},
});

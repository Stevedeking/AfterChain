/**
 * Afterchain — Client Entry Point
 * No wagmi. No RainbowKit. Pure viem + window.ethereum.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app';

// Afterchain build — viem-only wallet, no wagmi
const rootElement = document.getElementById('root');

if (!rootElement) {
	throw new Error('Root element not found');
}

createRoot(rootElement).render(
	<StrictMode>
		<App />
	</StrictMode>
);

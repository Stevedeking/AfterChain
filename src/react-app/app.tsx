/**
 * Afterchain App — v5
 *
 * WalletProvider (window.ethereum + viem) wraps RouterProvider.
 * No wagmi, no RainbowKit — zero external CDN dependencies.
 * Pure viem + window.ethereum for wallet connection.
 */

import { createBrowserRouter, RouterProvider } from 'react-router';
import { WalletProvider } from './lib/wallet';
import './globals.css';

const router = createBrowserRouter([
	{ path: '/', lazy: async () => ({ Component: (await import('./pages/LandingPage')).default }) },
	{ path: '/write', lazy: async () => ({ Component: (await import('./pages/WriteWillPage')).default }) },
	{ path: '/summary', lazy: async () => ({ Component: (await import('./pages/SummaryPage')).default }) },
	{ path: '/deploy', lazy: async () => ({ Component: (await import('./pages/DeployPage')).default }) },
	{ path: '/dashboard', lazy: async () => ({ Component: (await import('./pages/DashboardPage')).default }) },
	{ path: '/beneficiary', lazy: async () => ({ Component: (await import('./pages/BeneficiaryPage')).default }) },
]);

export default function App() {
	return (
		<WalletProvider>
			<RouterProvider router={router} />
		</WalletProvider>
	);
}

/**
 * Afterchain Wallet Context
 *
 * Self-contained wallet connection using window.ethereum + viem.
 * No wagmi, no RainbowKit — zero external CDN dependencies.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  defineChain,
  type PublicClient,
  type WalletClient,
  type Hash,
  type Abi,
} from 'viem';

// ============================================================================
// Etherlink Shadownet chain definition
// ============================================================================

export const etherlinkShadownet = defineChain({
  id: 127823,
  name: 'Etherlink Shadownet',
  nativeCurrency: { decimals: 18, name: 'Tez', symbol: 'XTZ' },
  rpcUrls: {
    default: {
      http: [
        (import.meta.env.VITE_ETHERLINK_RPC as string) ||
          'https://node.shadownet.etherlink.com',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'Etherlink Explorer',
      url: 'https://shadownet.explorer.etherlink.com',
    },
  },
  testnet: true,
});

// ============================================================================
// Public client (read-only, no wallet needed)
// ============================================================================

export const publicClient: PublicClient = createPublicClient({
  chain: etherlinkShadownet,
  transport: http(
    (import.meta.env.VITE_ETHERLINK_RPC as string) ||
      'https://node.shadownet.etherlink.com'
  ),
});

// ============================================================================
// Helper: switch or add Etherlink Shadownet
// ============================================================================

const SHADOWNET_CHAIN_ID = '0x1f34f'; // 127823 in hex — verified: (127823).toString(16) = "1f34f"

const switchToShadownet = async (ethereum: any) => {
  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SHADOWNET_CHAIN_ID }],
    });
  } catch (switchErr: unknown) {
    if ((switchErr as { code?: number }).code === 4902) {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: SHADOWNET_CHAIN_ID,
            chainName: 'Etherlink Shadownet',
            nativeCurrency: { name: 'Tez', symbol: 'XTZ', decimals: 18 },
            rpcUrls: [
              (import.meta.env.VITE_ETHERLINK_RPC as string) ||
                'https://node.shadownet.etherlink.com',
            ],
            blockExplorerUrls: ['https://shadownet.explorer.etherlink.com'],
          },
        ],
      });
    } else {
      throw switchErr;
    }
  }
};

// ============================================================================
// Context types
// ============================================================================

interface WalletContextValue {
  address: `0x${string}` | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  walletClient: WalletClient | null;
  readContract: <T>(params: {
    address: `0x${string}`;
    abi: Abi;
    functionName: string;
    args?: unknown[];
  }) => Promise<T>;
  writeContract: (params: {
    address: `0x${string}`;
    abi: Abi;
    functionName: string;
    args?: unknown[];
    value?: bigint;
  }) => Promise<Hash>;
  waitForTransaction: (hash: Hash) => Promise<{ status: 'success' | 'reverted' }>;
}

// ============================================================================
// Context
// ============================================================================

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);

  // Ref to suppress chainChanged handler while connect() is mid-flight
  const isConnectingRef = useRef(false);

  // Restore session on mount
  useEffect(() => {
    const stored = localStorage.getItem('afterchain_wallet');
    if (stored) {
      tryReconnect(stored as `0x${string}`);
    }
  }, []);

  const tryReconnect = async (storedAddress: `0x${string}`) => {
    if (typeof window === 'undefined') return;
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;

    try {
      const accounts = (await ethereum.request({
        method: 'eth_accounts',
      })) as string[];
      if (
        accounts.length > 0 &&
        accounts[0].toLowerCase() === storedAddress.toLowerCase()
      ) {
        await switchToShadownet(ethereum);
        const wc = createWalletClient({
          chain: etherlinkShadownet,
          transport: custom(ethereum),
        });
        setAddress(accounts[0] as `0x${string}`);
        setWalletClient(wc);
      } else {
        localStorage.removeItem('afterchain_wallet');
      }
    } catch {
      localStorage.removeItem('afterchain_wallet');
    }
  };

  // Listen for account and chain changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setAddress(null);
        setWalletClient(null);
        localStorage.removeItem('afterchain_wallet');
      } else {
        setAddress(accounts[0] as `0x${string}`);
        localStorage.setItem('afterchain_wallet', accounts[0]);
      }
    };

    const handleChainChanged = async (chainId: string) => {
      // Ignore while connect() is running — it owns the switch flow
      if (isConnectingRef.current) return;

      if (chainId.toLowerCase() !== SHADOWNET_CHAIN_ID.toLowerCase()) {
        // User switched away from Shadownet — try to pull them back
        try {
          await switchToShadownet(ethereum);
          // Re-create walletClient after confirmed switch
          setWalletClient(
            createWalletClient({
              chain: etherlinkShadownet,
              transport: custom(ethereum),
            })
          );
        } catch {
          // User rejected — disconnect to avoid wrong-chain state
          setAddress(null);
          setWalletClient(null);
          localStorage.removeItem('afterchain_wallet');
        }
      } else {
        // User switched TO Shadownet externally — ensure walletClient is alive
        setWalletClient(
          createWalletClient({
            chain: etherlinkShadownet,
            transport: custom(ethereum),
          })
        );
      }
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    return () => {
      ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
      ethereum.removeListener?.('chainChanged', handleChainChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === 'undefined') {
      alert('No wallet detected. Please install MetaMask or another EVM wallet.');
      return;
    }
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      alert('No wallet detected. Please install MetaMask or another EVM wallet.');
      return;
    }

    setIsConnecting(true);
    isConnectingRef.current = true; // suppress chainChanged handler during this flow
    try {
      const accounts = (await ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[];

      if (accounts.length === 0) throw new Error('No accounts returned');

      await switchToShadownet(ethereum); // chainChanged fires here but ref suppresses it

      const wc = createWalletClient({
        chain: etherlinkShadownet,
        transport: custom(ethereum),
      });

      setAddress(accounts[0] as `0x${string}`);
      setWalletClient(wc);
      localStorage.setItem('afterchain_wallet', accounts[0]);
    } catch (err) {
      console.error('Wallet connect failed:', err);
    } finally {
      setIsConnecting(false);
      isConnectingRef.current = false; // re-enable handler after state is fully set
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setWalletClient(null);
    localStorage.removeItem('afterchain_wallet');
  }, []);

  const readContract = useCallback(
    async <T,>(params: {
      address: `0x${string}`;
      abi: Abi;
      functionName: string;
      args?: unknown[];
    }): Promise<T> => {
      const result = await publicClient.readContract({
        address: params.address,
        abi: params.abi,
        functionName: params.functionName,
        args: params.args,
      });
      return result as T;
    },
    []
  );

  const writeContract = useCallback(
    async (params: {
      address: `0x${string}`;
      abi: Abi;
      functionName: string;
      args?: unknown[];
      value?: bigint;
    }): Promise<Hash> => {
      if (!walletClient || !address) throw new Error('Wallet not connected');
      const hash = await walletClient.writeContract({
        address: params.address,
        abi: params.abi,
        functionName: params.functionName,
        args: params.args,
        value: params.value,
        account: address,
        chain: etherlinkShadownet,
      });
      return hash;
    },
    [walletClient, address]
  );

  const waitForTransaction = useCallback(
    async (hash: Hash): Promise<{ status: 'success' | 'reverted' }> => {
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      // receipt.status is already 'success' | 'reverted' in viem — not a number
      return {
        status: receipt.status === 'success' ? 'success' : 'reverted',
      };
    },
    []
  );

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected: !!address,
        isConnecting,
        connect,
        disconnect,
        walletClient,
        readContract,
        writeContract,
        waitForTransaction,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
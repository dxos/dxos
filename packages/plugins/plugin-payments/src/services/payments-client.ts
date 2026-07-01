//
// Copyright 2026 DXOS.org
//

import { ExactEvmScheme, toClientEvmSigner } from '@x402/evm';
import { wrapFetchWithPaymentFromConfig } from '@x402/fetch';
import { type WalletClient, createPublicClient, createWalletClient, custom, http } from 'viem';
import { baseSepolia } from 'viem/chains';

import { type Client } from '@dxos/client';
import { log } from '@dxos/log';

import { createEdgeAuthedFetch, getEdgeAuthHeader } from './edge-auth';

//
// payments-service client (x402 protocol v2).
//
// Network is Base Sepolia testnet (CAIP-2 `eip155:84532`), testnet USDC, scheme `exact`.
//

/** CAIP-2 network id for the x402 v2 scheme registration. */
export const PAYMENTS_NETWORK = 'eip155:84532' as const;

export type PremiumResponse = {
  message: string;
  did: string;
  network: string;
  /** Raw value of the `X-PAYMENT-RESPONSE` header, when present. */
  paymentResponse?: string;
};

/** Minimal shape of an injected EVM provider (e.g. `window.ethereum`). */
type Eip1193Provider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

const getInjectedProvider = (): Eip1193Provider | undefined =>
  (globalThis as any).ethereum as Eip1193Provider | undefined;

/**
 * Ensures the wallet's active chain is Base Sepolia. EIP-3009 signing requires the wallet's active
 * chain to match the payment domain's chainId, so prompt the wallet to switch — and to add the network
 * first if it isn't known (error 4902). Idempotent when already on the right chain.
 */
const ensureBaseSepolia = async (provider: Eip1193Provider): Promise<void> => {
  const chainId = `0x${baseSepolia.id.toString(16)}`;
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] });
  } catch (err) {
    if ((err as { code?: number })?.code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId,
            chainName: baseSepolia.name,
            nativeCurrency: baseSepolia.nativeCurrency,
            rpcUrls: [baseSepolia.rpcUrls.default.http[0]],
            blockExplorerUrls: [baseSepolia.blockExplorers?.default.url].filter(Boolean),
          },
        ],
      });
      await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] });
    } else {
      throw err;
    }
  }
};

/**
 * Connects the injected EVM wallet, ensures it is on Base Sepolia, and returns a viem `WalletClient`
 * plus the selected account address. Uses the first available account.
 * TODO(burdon): Surface a wallet/account picker rather than defaulting to the first account.
 */
const connectWallet = async (): Promise<{ walletClient: WalletClient; address: `0x${string}` }> => {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new Error('No injected EVM wallet (window.ethereum) detected.');
  }
  const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as `0x${string}`[];
  const address = accounts[0];
  if (!address) {
    throw new Error('No account exposed by the injected wallet.');
  }
  await ensureBaseSepolia(provider);
  const walletClient = createWalletClient({ account: address, chain: baseSepolia, transport: custom(provider) });
  return { walletClient, address };
};

/**
 * Builds a `fetch` that (1) injects the edge VP `Authorization` header and (2) transparently completes
 * an x402 payment on a 402 response by signing an EIP-3009 USDC transfer with the connected wallet.
 */
const createPaidFetch = async (client: Client, baseUrl: string): Promise<typeof globalThis.fetch> => {
  const { walletClient, address } = await connectWallet();
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });

  // The x402 client signer needs `address` + `signTypedData`; `toClientEvmSigner` adds the public-client
  // read capability used for EIP-2612/allowance enrichment.
  const signer = toClientEvmSigner(
    {
      address,
      signTypedData: (message) =>
        walletClient.signTypedData({
          account: address,
          domain: message.domain as any,
          types: message.types as any,
          primaryType: message.primaryType as any,
          message: message.message as any,
        }),
    },
    {
      readContract: (args) => publicClient.readContract(args as any),
    },
  );

  // Base fetch already carries the edge Authorization header; x402 layers X-PAYMENT on the retry.
  const baseFetch = createEdgeAuthedFetch(client, baseUrl);
  return wrapFetchWithPaymentFromConfig(baseFetch, {
    schemes: [{ network: PAYMENTS_NETWORK, client: new ExactEvmScheme(signer) }],
  });
};

/**
 * Calls `GET /premium`. The gate accepts a sufficient credit balance (debited automatically) OR an
 * inline x402 payment. When payment is required the server returns 402 + requirements; the x402 wrapper
 * signs the USDC transfer and retries with an `X-PAYMENT` header.
 */
export const buyPremium = async (client: Client, baseUrl: string): Promise<PremiumResponse> => {
  const paidFetch = await createPaidFetch(client, baseUrl);
  const response = await paidFetch(new URL('/premium', baseUrl));
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`/premium failed: ${response.status} ${text}`);
  }
  const body = (await response.json()) as Omit<PremiumResponse, 'paymentResponse'>;
  const paymentResponse = response.headers.get('X-PAYMENT-RESPONSE') ?? undefined;
  log.info('premium purchased', { did: body.did, network: body.network, settled: !!paymentResponse });
  return { ...body, paymentResponse };
};

/**
 * Calls `POST /stripe/checkout` (edge-auth required) and returns the hosted Stripe Checkout URL. The
 * caller redirects the browser there (`window.location.href = url`).
 */
export const createStripeCheckout = async (
  client: Client,
  baseUrl: string,
  credits = 100,
): Promise<{ url: string }> => {
  const authHeader = await getEdgeAuthHeader(client, baseUrl);
  const response = await globalThis.fetch(new URL('/stripe/checkout', baseUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
    body: JSON.stringify({ credits }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`/stripe/checkout failed: ${response.status} ${text}`);
  }
  return (await response.json()) as { url: string };
};

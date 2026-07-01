# @dxos/plugin-payments

Composer plugin (spike) that lets a user pay for an edge resource served by the `payments-service`
(in the `dxos/edge` repo), using the **x402 protocol v2**.

> Status: scaffold / spike. Real APIs are wired where known; the wallet UX is intentionally minimal
> and TODOs mark anything needing confirmation.

## What it does

Adds a settings panel (under Composer settings → Payments) with:

- A `paymentsUrl` setting — base URL of the payments-service (no trailing slash). Not hardcoded.
- **Buy premium (x402)** — connects an injected EVM wallet, calls `GET /premium` through an authed +
  x402-paid `fetch`, and shows the JSON result.
- **Buy 100 credits (Stripe)** — `POST /stripe/checkout` then redirects the browser to the hosted
  Stripe Checkout URL.

## Service contract

- `GET /premium` — requires an edge session (VP auth) **and** payment. Accepts a sufficient credit
  balance (debited automatically) OR an inline x402 payment. On x402 it returns HTTP 402 with payment
  requirements; the client signs an EIP-3009 USDC transfer and retries with an `X-PAYMENT` header.
  Success → `{ message, did, network }` + an `X-PAYMENT-RESPONSE` header.
- `POST /stripe/checkout` — edge-auth required; JSON `{ credits?: number }` (default 100) → `{ url }`.
- Network: Base Sepolia testnet, CAIP-2 `eip155:84532`, testnet USDC, scheme `exact`.

## Edge VP auth

The payments-service uses the same verifiable-presentation auth as the rest of DXOS Edge
(`Authorization: VerifiablePresentation pb;base64,<...>`). Because it runs at a **different** URL than
the configured edge URL, `createEdgeHttpClient` can't be reused as-is (it reads
`client.config.values.runtime.services.edge.url`). Instead `src/services/edge-auth.ts` reproduces the
small handshake from the public `@dxos/edge-client` / `@dxos/client/edge` primitives:

```
createEdgeIdentity(client) -> handleAuthChallenge(401Response, identity) -> encodeAuthHeader(presentation)
```

`createEdgeAuthedFetch(client, baseUrl)` returns a `fetch` that injects this `Authorization` header on
every request; it is passed as the **base fetch** to the x402 wrapper so that on the 402 retry both
`Authorization` (edge) and `X-PAYMENT` (x402) headers are present.

### TODO — VP-auth extraction

`EdgeHttpClient`/`BaseHttpClient` perform this handshake internally but the handler
(`_handleUnauthorized`) is `protected` and hard-wired to the configured edge URL. The cleanest long-term
fix is to expose a public, URL-agnostic `getEdgeAuthHeader(identity, baseUrl)` in `@dxos/edge-client`
and have this plugin call it. Until then the copy in `edge-auth.ts` is a faithful, thin reproduction of
the auth branch in `BaseHttpClient._call`.

## x402 wallet signing

`src/services/payments-client.ts` builds the paid fetch with
`wrapFetchWithPaymentFromConfig(baseFetch, { schemes: [{ network: 'eip155:84532', client: new ExactEvmScheme(signer) }] })`
(`@x402/fetch`, `@x402/evm`). The signer is composed via `toClientEvmSigner(account, publicClient)` from
a viem wallet (`createWalletClient({ account, chain: baseSepolia, transport: custom(window.ethereum) })`)
plus a `createPublicClient` read client.

### TODOs — wallet UX

- Assumes the injected wallet is already on Base Sepolia and uses the first account. No chain-switch /
  account-picker prompt yet.
- No balance display or pre-flight check before invoking `/premium`.

## How to try it

1. Register `PaymentsPlugin` in the app's plugin set.
2. Deploy / run the `payments-service` and set its base URL in Composer settings → Payments.
3. Sign in (an edge identity is required for VP auth).
4. For x402: have a Base Sepolia wallet (e.g. MetaMask) with testnet USDC injected as `window.ethereum`,
   then click **Buy premium (x402)** and approve the signature.
5. For Stripe: click **Buy 100 credits (Stripe)** to be redirected to hosted Checkout.

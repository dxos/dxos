# Lightweight EDGE Service Client — Design

Date: 2026-06-15

## Problem

Callers that talk to EDGE-hosted HTTP services (the image service, future small
services) currently hand-roll `fetch` + `FormData` + response parsing. This has
already produced divergent, partly-broken implementations:

- `composer-crx/src/actions/image.ts` assumed `/thumbnail` returned JSON and
  called `await uploadRes.json()`; before the worker change it returned raw
  `image/webp` bytes, so the parse threw and the thumbnail URL was silently
  dropped.
- `plugin-crm/src/operations/attach-image.ts` carries a dual-contract branch
  (JSON `{ url }` vs raw bytes via `response.url`, the DX-1002 fallback) that is
  now dead since the worker was unified to always return JSON.

The existing `BaseHttpClient` / `EdgeHttpClient` in `@dxos/edge-client` provide
auth + retry + tracing but pull in `@dxos/context` and `@dxos/protocols`, which
is heavier than these callers want (composer-crx is a browser extension).

## Goal

Prototype a **very lightweight client API for EDGE services** as a utility in
`@dxos/edge-client`, shared by `composer-crx` and `plugin-crm`, using the image
service as the concrete first use-case.

## Decisions (from brainstorming)

| Decision                | Choice                                                                            |
| ----------------------- | --------------------------------------------------------------------------------- |
| Scope                   | Generic core client + image helper namespace                                      |
| API style               | Effect-returning (`Effect<A, EdgeServiceError>`)                                  |
| Dependency boundary     | New subpath; only `effect` + `@dxos/log`. No `@dxos/context`/`@dxos/protocols`    |
| Auth                    | None now; pluggable `authHeaders` seam left for later                             |
| Image endpoints         | Expose **both** `/upload` and `/thumbnail` as two methods on an `Image` namespace |
| composer-crx dependency | Add `@dxos/edge-client` (already transitively bundles `effect`)                   |

The `effect` dependency is the one departure from the absolute "dep-free" goal
of `cors-proxy`; it is intentional given the Effect-returning API and does not
re-introduce the heavy DXOS bundles (`@dxos/protocols` protobufjs).

## Architecture

New subpath export `@dxos/edge-client/service`, source under `src/service/`:

```
src/service/
  index.ts                    // export * from './edge-service'; export * as Image from './Image';
  edge-service.ts             // EdgeServiceClient, EdgeServiceError, options
  Image.ts                    // @import-as-namespace — upload(), thumbnail()
  edge-service.test.ts        // unit tests (injected fetch stub)
  image-service.e2e.test.ts   // live, env-gated
```

`package.json` gains an `./service` entry in `exports` (mirroring `./cors-proxy`).

### Generic core — `edge-service.ts`

```ts
export type EdgeServiceClientOptions = {
  baseUrl: string;
  /** X-DXOS-Client-Tag metering header (see EDGE_CLIENT_TAG_HEADER). */
  clientTag?: string;
  /** Per-request timeout; default 15s. */
  timeout?: Duration.DurationInput;
  /** Injectable for deterministic tests; defaults to globalThis.fetch. */
  fetch?: typeof globalThis.fetch;
  /** Auth seam; unused by the image service today. */
  authHeaders?: () => Effect.Effect<Record<string, string>>;
};

export class EdgeServiceError extends Data.TaggedError('EdgeServiceError')<{
  message: string;
  status?: number;
  cause?: unknown;
}> {}

export class EdgeServiceClient {
  constructor(options: EdgeServiceClientOptions);

  postForm<A>(path: string, form: FormData, schema: Schema.Schema<A>): Effect.Effect<A, EdgeServiceError>;
  postJson<A>(path: string, body: unknown, schema: Schema.Schema<A>): Effect.Effect<A, EdgeServiceError>;
}
```

Behaviour:

- Resolves `path` against `baseUrl` via `new URL(path, baseUrl)`.
- Sets `X-DXOS-Client-Tag` when `clientTag` present; merges `authHeaders()` when provided. Never sets `Content-Type` for `FormData` (lets the runtime set the multipart boundary).
- Applies `AbortSignal.timeout(timeout)`; wraps the whole call in `Effect.timeout`.
- Maps every failure mode to `EdgeServiceError`: network/abort (`cause`), non-2xx (`status` + truncated body text), JSON parse failure, and `Schema` decode failure.
- On success decodes the JSON body with `Schema.decodeUnknown(schema)`.

### Image helper — `Image.ts`

```ts
// @import-as-namespace

export const DEFAULT_IMAGE_SERVICE_URL = 'https://image-service-main.dxos.workers.dev';

export const Result = Schema.Struct({
  id: Schema.optional(Schema.String),
  url: Schema.String,
});
export type Result = typeof Result.Type;

export type UploadOptions = {
  /** Multipart field name; default 'file'. */
  field?: string;
  /** Upload filename; default derived or 'image'. */
  filename?: string;
};

export const upload: (
  client: EdgeServiceClient,
  blob: Blob,
  opts?: UploadOptions,
) => Effect.Effect<Result, EdgeServiceError>;

export const thumbnail: (
  client: EdgeServiceClient,
  blob: Blob,
  opts?: UploadOptions,
) => Effect.Effect<Result, EdgeServiceError>;
```

`upload` POSTs to `/upload`, `thumbnail` POSTs to `/thumbnail`; both share one
internal `uploadToPath(client, blob, path, opts)` that builds the `FormData`
(`field` → `blob`, `filename`) and calls `client.postForm(path, form, Result)`.
The two endpoints are now contract-identical (`{ id, url }`); exposing both
mirrors the worker routes and lets callers stay on their current endpoint.

Callers construct the client themselves so the base URL stays configurable
(`new EdgeServiceClient({ baseUrl: DEFAULT_IMAGE_SERVICE_URL, clientTag })`).

## Consumer refactors (same change, no shims)

1. **plugin-crm `attach-image.ts`** — keep the existing content-type validation
   and allowlist; replace the manual `FormData` + `fetch('/thumbnail')` +
   dual-contract parse with `Image.thumbnail(client, blob, { filename })` inside
   the existing `Effect.gen`. Delete the dead DX-1002 raw-bytes fallback. The
   client is built from `serviceUrl` (its existing override input).

2. **composer-crx `actions/image.ts`** — add `@dxos/edge-client` dependency.
   Replace the broken `await uploadRes.json()` block with
   `const { url } = await Effect.runPromise(Image.thumbnail(client, blob, { filename }))`,
   building the client from `config.imageServiceUrl`. Fixes the current breakage.
   Keep the existing browser-extension storage/popup side-effects.

## Testing

- **Unit** (`edge-service.test.ts`) — inject a stub `fetch`; deterministic, runs
  in CI. Covers: `postForm`/`postJson` happy path and header construction;
  `Image.upload`/`Image.thumbnail` happy path (correct path + `file` field);
  non-2xx → `EdgeServiceError` with `status`; malformed JSON → `EdgeServiceError`;
  schema-mismatch → `EdgeServiceError`; timeout → `EdgeServiceError`.
- **Live e2e** (`image-service.e2e.test.ts`) — move the existing plugin-support
  live test into edge-client, retargeted at `Image.upload`/`Image.thumbnail`
  against the real worker. Gated behind `DX_RUN_IMAGE_SERVICE_E2E`; skipped in
  CI. Uses the embedded synthetic 32×32 PNG fixture (the worker rejects
  degenerate inputs like a 1×1 PNG with 422).
- Update/remove the now-superseded `plugin-support` e2e test accordingly (the
  `uploadScreenshot` helper itself is unchanged for now; only the standalone
  image-service e2e moves).

## Scope guard (YAGNI)

Out of scope for v1: auth wiring (seam only), retry, GET/streaming, and
absorbing `uploadScreenshot` into the new client. These can layer on once the
prototype proves the shape.

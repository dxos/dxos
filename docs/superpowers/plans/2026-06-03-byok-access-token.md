# BYOK Access Token Implementation Plan (DX-979)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user "bring their own" Anthropic API key per-space. Storage and UI reuse the existing `IntegrationProvider` extensibility mechanism (same shape as the Discord bot integration); `plugin-assistant` contributes an "Anthropic" provider, so no new UI is needed. Composer attaches the user's key as `X-BYOK` on outbound AI-service requests; the edge AI service prefers it over the server's `ANTHROPIC_API_KEY` and tags both paths separately in Cloudflare Analytics Engine.

**Architecture:**
- **Provider (dxos repo)** — `plugin-assistant` contributes an `IntegrationProvider` entry with `id: 'anthropic'`, `source: 'anthropic.com'`, a non-OAuth `credentialForm` that asks for an Anthropic API key and (best-effort) validates it via `GET https://api.anthropic.com/v1/models`. Mirrors `plugin-discord/src/capabilities/integration-provider.ts`. The form's `onSubmit` returns `{ kind: 'complete', accessToken, integration }` — `plugin-integration`'s existing coordinator persists both objects into the space's database with no UI changes here.
- **Storage (dxos repo)** — `AccessToken` is stored with `source: 'anthropic.com'`, matching the convention used by every other provider (Discord uses `'discord.com'`). `Integration.providerId = 'anthropic'` routes any future provider-specific behavior.
- **Header injection (dxos repo)** — a new `byokHeaderLayer(providerHost)` Effect Layer wraps the `HttpClient.HttpClient` service used by `FunctionsAiHttpClient`, looks up a credential for `'anthropic.com'` via `CredentialsService`, and injects `X-BYOK: <token>` via `HttpClient.mapRequestEffect`. Composed inside `InternalAiServiceLayer` so BYOK is scoped to AI-service traffic only.
- **Edge AI service (edge repo)** — `proxyAnthropicRoute` in `packages/services/ai-service/src/api.ts` reads `X-BYOK`; if present and non-empty it is used as the Anthropic `x-api-key` instead of `c.env.ANTHROPIC_API_KEY`. A new `keySource: 'server' | 'byok'` field is added to `AnthropicMeteringContext` and `AiMeterEvent`, written as `blob10` in `writeMetering` so existing Analytics Engine queries remain valid.

**Tech Stack:** TypeScript, Effect-TS (`@effect/platform/HttpClient`, `Effect.gen`, `Layer`), DXOS ECHO (`@dxos/echo`, `@dxos/types`), DXOS app-framework (`@dxos/app-framework`), Hono (edge ai-service), Cloudflare Workers + Analytics Engine, vitest.

**Measurable success criterion:** With a Composer dev session running locally, a user can open an active space, paste an Anthropic API key via the standard "Create Integration → Anthropic" flow, and from that moment **every** outbound HTTP request triggered by sending a message in the assistant chat — observed in DevTools → Network on the `/ai/generate/anthropic` (or `/provider/anthropic/messages`) request — carries an `X-BYOK: <that-key>` header. Removing the integration causes subsequent requests to drop the header (server-key fallback).

## Page-side BYOK pipeline (Composer chat → edge)

The chat path is independent from the worker/function path (which `Task 2` covers via `InternalAiServiceLayer`). For the Composer chat sidebar to attach `X-BYOK`, five pieces must line up:

1. **AccessToken written to the space DB.** `plugin-assistant`'s `IntegrationProvider` `onSubmit` (`packages/plugins/plugin-assistant/src/capabilities/integration-provider.ts`) creates an `AccessToken` with `source: 'anthropic.com'` and `token: <user-key>`, plus a paired `Integration` (`providerId: 'anthropic'`). `plugin-integration`'s coordinator persists both into the active space's ECHO database. **No new code in this fix — this exists today.**
2. **`CredentialsService` materialised from the space DB.** `plugin-client` contributes `CredentialsLayerSpec` (`packages/plugins/plugin-client/src/capabilities/layer-specs.ts:77-84`) with `affinity: 'space'`, `requires: [Database.Service]`, backed by `credentialsLayerFromDatabase()` from `@dxos/functions`. That function queries `AccessToken` objects in the space and maps each to `{ service: token.source, apiKey: token.token }`. So whenever the LayerSpec graph is materialised for a specific `space`, `Credential.CredentialsService` is wired to a real lookup into that space's tokens.
3. **`byokHeaderLayer` reads the credential.** `byokHeaderLayer('anthropic.com')` (`packages/core/compute/compute/src/byok.ts`) wraps the underlying `HttpClient.HttpClient` via `mapRequestEffect`: on every request it yields `Credential.CredentialsService`, calls `queryCredentials({ service: 'anthropic.com' })`, takes the first hit's `apiKey`, and `HttpClientRequest.setHeader(request, 'X-BYOK', apiKey)`. If no credential is present the request is forwarded unchanged.
4. **`EdgeAiHttpClient` carries the header upstream.** `EdgeAiHttpClient.layerWithByok(getEdgeClient, byokHeaderLayer(ANTHROPIC_SOURCE))` (`packages/core/mesh/edge-client/src/edge-ai-http-client.ts:96-99`) composes the BYOK injector over `EdgeAiHttpClient.layer`, so the wrapped `HttpClient` is what `AnthropicClient.layer({ apiUrl: 'http://edge.internal' })` consumes. `EdgeAiHttpClient.make` then forwards `request.headers` (now including `X-BYOK`) to `edgeClient.anthropicAiRequest(new Request(url, { headers, … }))`.
5. **AI service spec declares the requirement.** `plugin-assistant`'s AI-service `LayerSpec` (`packages/plugins/plugin-assistant/src/capabilities/ai-service.ts`) must be `affinity: 'space'`, `requires: [Credential.CredentialsService]`. Without these, `ServiceResolver.provide({ space }, AiService.AiService, …)` in `useChatProcessor.ts:85-94` materialises `AiService.AiService` in an app-scoped fiber with no `CredentialsService` in context, and step 3 dies at runtime with `Service not found: @dxos/functions/CredentialsService`.

The fix in this branch makes step 5 honest and removes the `as Layer<…, never, never>` cast in `edge-model-resolver.ts` that previously hid step 3's requirement from the type system. The deprecated `AppCapabilities.AiServiceLayer` contribution is preserved with an empty-credentials fallback (`configuredCredentialsLayer([])`) so the legacy storybook + comment-thread agent paths still typecheck — but those paths intentionally do not carry BYOK, mirroring the worker fallback at `functions/src/protocol/protocol.ts:208-210` when no space context is available.

**Pipeline diagram:**

```
[Integration UI] → IntegrationProvider.onSubmit
                 → AccessToken{ source: 'anthropic.com', token } in space DB
                                                                 │
                                                                 ▼
                              CredentialsLayerSpec (affinity: 'space')
                                                                 │
                          credentialsLayerFromDatabase() reads AccessTokens
                                                                 ▼
                                  Credential.CredentialsService
                                                                 │
        ai-service LayerSpec (affinity: 'space', requires: CredentialsService)
                                                                 ▼
                                          byokHeaderLayer('anthropic.com')
                                                                 │
                              mapRequestEffect → setHeader('X-BYOK', apiKey)
                                                                 ▼
                                            EdgeAiHttpClient.layerWithByok
                                                                 │
                                        edgeClient.anthropicAiRequest(request)
                                                                 ▼
                       POST {edge}/ai/generate/anthropic  (headers include X-BYOK)
                                                                 │
                                              proxyAnthropicRoute (edge repo)
                                                                 ▼
                              Anthropic API request with x-api-key = X-BYOK
```

**What breaks the pipeline (regression checklist):**

- Re-introducing the cast in `edge-model-resolver.ts` (`as Layer<…, never, never>`) — silently hides the dependency.
- Changing the AI-service `LayerSpec` back to `affinity: 'application'` or dropping `requires: [Credential.CredentialsService]` — `ServiceResolver` materialises the layer without space context.
- Providing a stub `Credential.CredentialsService` into the resolver layer (e.g. `configuredCredentialsLayer([])`) before the LayerSpec wraps it — the empty store shadows the real per-space store.
- Removing `EdgeAiHttpClient.layerWithByok` in favour of plain `EdgeAiHttpClient.layer` — the request bypasses the BYOK wrapper.
- `IntegrationProvider.onSubmit` writing the AccessToken to the wrong space (e.g. personal space when the chat is in a shared space) — `queryCredentials` runs against the chat's space DB and finds nothing.

**Working directories:**
- dxos worktree: `/Users/mykola/dev/dxos/.claude/worktrees/eager-noyce-ab89ce` (branch assigned by the harness).
- edge worktree: `/Users/mykola/dev/edge/.claude/worktrees/dx-979-byok` (branch `claude/dx-979-byok-x-header`).

**Reference implementations to read before starting:**
- Discord bot provider (full non-OAuth example with credential validation and `onTokenCreated`): `packages/plugins/plugin-discord/src/capabilities/integration-provider.ts:40-169`.
- Discord plugin registration: `packages/plugins/plugin-discord/src/DiscordPlugin.ts:15-26`.
- IntegrationProvider capability + types: `packages/plugins/plugin-integration/src/types/integration-provider.ts:89-142`.
- AccessToken schema: `packages/sdk/types/src/types/AccessToken.ts:12-43`.

**Out of scope:**
- Encrypting tokens at rest beyond ECHO defaults.
- Per-user (HALO-scoped) BYOK tokens — the existing `Integration`/`AccessToken` model is space-scoped, visible to all members.
- Disabling the server-key fallback (deployment-time toggle deferred).
- An OAuth flow for Anthropic — `credentialForm` returns `kind: 'complete'` directly.

---

## File Structure

### dxos repo (`/Users/mykola/dev/dxos/.claude/worktrees/eager-noyce-ab89ce`)

**Create:**
- `packages/core/compute/functions/src/services/byok.ts` — `byokHeaderLayer(providerHost)` factory.
- `packages/core/compute/functions/src/services/byok.test.ts` — unit tests for the layer.
- `packages/plugins/plugin-assistant/src/capabilities/anthropic-integration-provider.ts` — `IntegrationProvider` entry for Anthropic (credential form + constants).
- `packages/plugins/plugin-assistant/src/capabilities/anthropic-integration-provider.test.ts` — credential-form unit test.

**Modify:**
- `packages/core/compute/functions/src/services/index.ts` — re-export from `./byok`.
- `packages/core/compute/functions/src/protocol/protocol.ts:283-295` — insert `byokHeaderLayer(ANTHROPIC_SOURCE)` between `FunctionsAiHttpClient.layer` and `AnthropicClient.layer`.
- `packages/plugins/plugin-assistant/src/AssistantPlugin.ts` — add `Plugin.addModule({ activatesOn: AppActivationEvents.SetupIntegrationProviders, activate: AnthropicIntegrationProvider })`.
- `packages/plugins/plugin-assistant/src/capabilities/index.ts` (barrel).
- `packages/plugins/plugin-assistant/src/translations/en-US.ts` (and any other locales) if the plugin uses translation indirection in schema annotations.

### edge repo (`/Users/mykola/dev/edge/.claude/worktrees/dx-979-byok`)

**Modify:**
- `packages/services/ai-service/src/api.ts:171-196` — `proxyAnthropicRoute`: read `X-BYOK`, prefer it over `ANTHROPIC_API_KEY`, pass `keySource` into `metering`.
- `packages/services/ai-service/src/anthropic-metering.ts:5,16-21,55-69` — add `keySource?: 'server' | 'byok'` to `AnthropicMeteringContext`; forward it to `writeMetering`.
- `packages/sdk/edge-platform/src/metering.ts:11-32,78-93,131-156` — extend slot-map comment with `blob10: keySource`, add field to `AiMeterEvent`, write it in the `'ai'` branch.

---

# Phase A — dxos repo

## Task 1: dxos — `byokHeaderLayer` Effect Layer

**Files:**
- Create: `packages/core/compute/functions/src/services/byok.ts`
- Create: `packages/core/compute/functions/src/services/byok.test.ts`
- Modify: `packages/core/compute/functions/src/services/index.ts`

- [ ] **Step 1: Write the failing test**

Create `/Users/mykola/dev/dxos/.claude/worktrees/eager-noyce-ab89ce/packages/core/compute/functions/src/services/byok.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, expect, test } from 'vitest';

import { Credential } from '@dxos/compute';

import { byokHeaderLayer } from './byok';
import { ConfiguredCredentialsService } from './credentials';

const captureHeaderClient = (sink: { lastHeader?: string }) =>
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request) => {
      sink.lastHeader = request.headers['x-byok'];
      return Effect.succeed(new Response('ok') as any);
    }),
  );

describe('byokHeaderLayer', () => {
  test('attaches X-BYOK header when a credential is found for the provider host', async () => {
    const sink: { lastHeader?: string } = {};
    const credentials = new ConfiguredCredentialsService([
      { service: 'anthropic.com', apiKey: 'sk-ant-user' },
    ]);

    const program = Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      yield* client.execute(HttpClientRequest.get('http://internal/provider/anthropic/messages'));
    });

    await Effect.runPromise(
      program.pipe(
        Effect.provide(
          byokHeaderLayer('anthropic.com').pipe(
            Layer.provide(captureHeaderClient(sink)),
            Layer.provide(Layer.succeed(Credential.CredentialsService, credentials)),
          ),
        ),
      ),
    );

    expect(sink.lastHeader).toBe('sk-ant-user');
  });

  test('does not attach X-BYOK when no credential is found', async () => {
    const sink: { lastHeader?: string } = {};
    const credentials = new ConfiguredCredentialsService([]);

    const program = Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      yield* client.execute(HttpClientRequest.get('http://internal/provider/anthropic/messages'));
    });

    await Effect.runPromise(
      program.pipe(
        Effect.provide(
          byokHeaderLayer('anthropic.com').pipe(
            Layer.provide(captureHeaderClient(sink)),
            Layer.provide(Layer.succeed(Credential.CredentialsService, credentials)),
          ),
        ),
      ),
    );

    expect(sink.lastHeader).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the failing test (file missing)**

Run: `moon run functions:test -- packages/core/compute/functions/src/services/byok.test.ts`
Expected: FAIL — `./byok` does not export `byokHeaderLayer`.

- [ ] **Step 3: Implement `byokHeaderLayer`**

Create `/Users/mykola/dev/dxos/.claude/worktrees/eager-noyce-ab89ce/packages/core/compute/functions/src/services/byok.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Credential } from '@dxos/compute';

/**
 * BYOK (Bring Your Own Key) header injector for AI-service traffic.
 *
 * Wraps the ambient {@link HttpClient.HttpClient} with a `mapRequestEffect` that looks up a
 * credential for the supplied upstream provider host (e.g. `'anthropic.com'`) from
 * {@link Credential.CredentialsService}. When a matching {@link AccessToken} is present in the
 * space, its token is attached as `X-BYOK` on outbound requests; otherwise the request is forwarded
 * unchanged and the AI service falls back to its server-side default key.
 *
 * The provider host matches the `source` field of `AccessToken` (the upstream provider's domain,
 * not the proxy's). The header travels through the AI-service proxy where it is unpacked.
 */
export const byokHeaderLayer = (providerHost: string) =>
  Layer.function(HttpClient.HttpClient, HttpClient.HttpClient, (client) =>
    HttpClient.mapRequestEffect(client, (request) =>
      Effect.gen(function* () {
        const credentials = yield* Credential.CredentialsService;
        const matches = yield* Effect.tryPromise({
          try: () => credentials.queryCredentials({ service: providerHost }),
          catch: () => undefined,
        }).pipe(Effect.orElseSucceed(() => [] as Credential.ServiceCredential[]));

        if (matches.length === 0) {
          return request;
        }
        return HttpClientRequest.setHeader(request, 'X-BYOK', matches[0].apiKey);
      }),
    ),
  );
```

- [ ] **Step 4: Re-export from the services barrel**

In `/Users/mykola/dev/dxos/.claude/worktrees/eager-noyce-ab89ce/packages/core/compute/functions/src/services/index.ts`, append:

```ts
export * from './byok';
```

(Do not remove any existing exports.)

- [ ] **Step 5: Run the test, expect pass**

Run: `moon run functions:test -- packages/core/compute/functions/src/services/byok.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
cd /Users/mykola/dev/dxos/.claude/worktrees/eager-noyce-ab89ce
git add packages/core/compute/functions/src/services/byok.ts packages/core/compute/functions/src/services/byok.test.ts packages/core/compute/functions/src/services/index.ts
git commit -m "feat(functions): byokHeaderLayer attaches X-BYOK from space credentials"
```

---

## Task 2: dxos — wire `byokHeaderLayer` into `InternalAiServiceLayer`

**Files:**
- Modify: `packages/core/compute/functions/src/protocol/protocol.ts`

- [ ] **Step 1: Add the import**

In `/Users/mykola/dev/dxos/.claude/worktrees/eager-noyce-ab89ce/packages/core/compute/functions/src/protocol/protocol.ts`, add (or extend) the import block for the services barrel near the other internal imports:

```ts
import { byokHeaderLayer } from '../services/byok';
```

- [ ] **Step 2: Insert `byokHeaderLayer` into the AI service layer**

Replace `InternalAiServiceLayer` (currently lines 280–295) with:

```ts
/**
 * AI service layer that proxies HTTP requests through the EDGE-provided `FunctionsAiService`.
 *
 * The `byokHeaderLayer('anthropic.com')` wrapper attaches `X-BYOK` to outbound requests whenever a
 * matching {@link AccessToken} is present in the space, letting the user override the server's
 * default Anthropic key on a per-space basis.
 */
const InternalAiServiceLayer = (functionsAiService: EdgeFunctionEnv.FunctionsAiService) =>
  AiModelResolver.AiModelResolver.buildAiService.pipe(
    Layer.provide(
      AnthropicResolver.make().pipe(
        Layer.provide(
          AnthropicClient.layer({
            // Note: It doesn't matter what is base url here, it will be proxied to ai gateway in edge.
            apiUrl: 'http://internal/provider/anthropic',
          }).pipe(
            Layer.provide(
              byokHeaderLayer('anthropic.com').pipe(Layer.provide(FunctionsAiHttpClient.layer(functionsAiService))),
            ),
          ),
        ),
      ),
    ),
  );
```

The hostname is the literal `'anthropic.com'` — it matches the `source` value used by the Anthropic `IntegrationProvider` registered in Task 3 and never needs to be derived from runtime config. No caller signature changes.

- [ ] **Step 3: Run the functions test suite**

Run: `moon run functions:test`
Expected: PASS — no regressions.

- [ ] **Step 4: Commit**

```bash
cd /Users/mykola/dev/dxos/.claude/worktrees/eager-noyce-ab89ce
git add packages/core/compute/functions/src/protocol/protocol.ts
git commit -m "feat(functions): inject byokHeaderLayer into InternalAiServiceLayer"
```

---

## Task 3: dxos — register an `Anthropic` IntegrationProvider in plugin-assistant

**Files:**
- Create: `packages/plugins/plugin-assistant/src/capabilities/anthropic-integration-provider.ts`
- Create: `packages/plugins/plugin-assistant/src/capabilities/anthropic-integration-provider.test.ts`
- Modify: `packages/plugins/plugin-assistant/src/AssistantPlugin.ts`
- Modify: `packages/plugins/plugin-assistant/src/capabilities/index.ts` (barrel)
- Modify (conditional): `packages/plugins/plugin-assistant/src/translations/en-US.ts` (and any other locales) if the plugin already uses translation indirection in schema annotations.

- [ ] **Step 1: Read the Discord template**

Before writing, read these two files end-to-end and use them as the structural template — the new provider should mirror their shape closely:

- `/Users/mykola/dev/dxos/.claude/worktrees/eager-noyce-ab89ce/packages/plugins/plugin-discord/src/capabilities/integration-provider.ts` — full provider module (constants, credential form, `onTokenCreated`, capability contribution).
- `/Users/mykola/dev/dxos/.claude/worktrees/eager-noyce-ab89ce/packages/plugins/plugin-discord/src/DiscordPlugin.ts` — how the provider is wired into the plugin via `Plugin.addModule({ activatesOn: AppActivationEvents.SetupIntegrationProviders, ... })`.

Also re-read the provider type so your fields match: `packages/plugins/plugin-integration/src/types/integration-provider.ts:116-135`.

- [ ] **Step 2: Write the failing test**

Create `/Users/mykola/dev/dxos/.claude/worktrees/eager-noyce-ab89ce/packages/plugins/plugin-assistant/src/capabilities/anthropic-integration-provider.test.ts`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, expect, test, vi } from 'vitest';

import { ANTHROPIC_PROVIDER_ID, ANTHROPIC_SOURCE, anthropicCredentialForm } from './anthropic-integration-provider';

describe('Anthropic integration provider', () => {
  test('uses anthropic.com as the AccessToken source', () => {
    expect(ANTHROPIC_SOURCE).toBe('anthropic.com');
    expect(ANTHROPIC_PROVIDER_ID).toBe('anthropic');
  });

  test('credentialForm.onSubmit returns kind=complete with the user-supplied token', async ({ expect }) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 }));
    try {
      const result = await anthropicCredentialForm.onSubmit({ token: 'sk-ant-abc' });
      expect(result.kind).toBe('complete');
      if (result.kind === 'complete') {
        expect(result.accessToken.source).toBe('anthropic.com');
        expect(result.accessToken.token).toBe('sk-ant-abc');
        expect(result.integration.providerId).toBe('anthropic');
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('credentialForm.onSubmit surfaces a validation error when Anthropic rejects the key', async ({ expect }) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('unauthorized', { status: 401 }));
    try {
      await expect(anthropicCredentialForm.onSubmit({ token: 'bad' })).rejects.toThrow(/invalid/i);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
```

- [ ] **Step 3: Run the failing test (file missing)**

Run: `moon run plugin-assistant:test -- packages/plugins/plugin-assistant/src/capabilities/anthropic-integration-provider.test.ts`
Expected: FAIL — the module does not exist.

- [ ] **Step 4: Implement the provider**

Create `/Users/mykola/dev/dxos/.claude/worktrees/eager-noyce-ab89ce/packages/plugins/plugin-assistant/src/capabilities/anthropic-integration-provider.ts`. Use the Discord provider as the structural reference; the field names below match `IntegrationProviderEntry` (`packages/plugins/plugin-integration/src/types/integration-provider.ts:116-135`).

```ts
//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { AccessToken } from '@dxos/types';

import {
  type CredentialForm,
  type CredentialFormResult,
  IntegrationProvider,
  Integration,
} from '@dxos/plugin-integration';

export const ANTHROPIC_PROVIDER_ID = 'anthropic';
export const ANTHROPIC_SOURCE = 'anthropic.com';
export const ANTHROPIC_LABEL = 'Anthropic';

const AnthropicCredentialInputs = Schema.Struct({
  token: Schema.String.annotations({
    title: 'API key',
    description: 'Your Anthropic API key (starts with `sk-ant-`).',
  }),
});

type AnthropicCredentialInputs = Schema.Schema.Type<typeof AnthropicCredentialInputs>;

const validateAnthropicKey = async (token: string): Promise<void> => {
  const response = await fetch('https://api.anthropic.com/v1/models', {
    headers: {
      'x-api-key': token,
      'anthropic-version': '2023-06-01',
    },
  });
  if (response.status === 401 || response.status === 403) {
    throw new Error('Anthropic rejected the key as invalid.');
  }
  // Best-effort: non-auth failures (5xx, CORS, network blocks) do not abort save.
};

export const anthropicCredentialForm: CredentialForm<AnthropicCredentialInputs> = {
  schema: AnthropicCredentialInputs,
  onSubmit: async ({ token }): Promise<CredentialFormResult> => {
    const trimmed = token.trim();
    if (!trimmed) {
      throw new Error('Anthropic API key is required.');
    }
    await validateAnthropicKey(trimmed);
    const accessToken = AccessToken.make({ source: ANTHROPIC_SOURCE, token: trimmed });
    const integration = Integration.make({
      name: ANTHROPIC_LABEL,
      providerId: ANTHROPIC_PROVIDER_ID,
      accessToken: Obj.refOf(accessToken),
      targets: [],
    });
    return { kind: 'complete', accessToken, integration };
  },
};

export default () =>
  Capability.contributes(IntegrationProvider, [
    {
      id: ANTHROPIC_PROVIDER_ID,
      source: ANTHROPIC_SOURCE,
      label: ANTHROPIC_LABEL,
      credentialForm: anthropicCredentialForm,
    },
  ]);
```

Notes for the implementer:
- Import paths for `CredentialForm`, `CredentialFormResult`, `IntegrationProvider`, and `Integration` must come from `@dxos/plugin-integration` (the package's `src/index.ts` barrel). If a symbol is not re-exported, add it to the barrel rather than importing from a sub-path.
- `Obj.refOf` may have a different exact name in this repo (e.g. `Ref.make` or `Obj.ref`). Confirm by reading how Discord constructs its `Integration` in `plugin-discord/src/capabilities/integration-provider.ts` and copy that idiom verbatim.

- [ ] **Step 5: Register the capability in `AssistantPlugin.ts`**

Open `/Users/mykola/dev/dxos/.claude/worktrees/eager-noyce-ab89ce/packages/plugins/plugin-assistant/src/AssistantPlugin.ts`. Locate the `Plugin.define(meta).pipe(...)` chain. Add a `Plugin.addModule` entry — pattern below; insert before `Plugin.make`:

```ts
import { AppActivationEvents } from '@dxos/app-framework';

import AnthropicIntegrationProvider from './capabilities/anthropic-integration-provider';

// ...

export const AssistantPlugin = Plugin.define(meta).pipe(
  // ...existing modules...
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupIntegrationProviders,
    activate: AnthropicIntegrationProvider,
  }),
  Plugin.make,
);
```

If `AppActivationEvents` is already imported, append `SetupIntegrationProviders` to the existing import. Mirror the local chain ordering if it differs from the snippet — the goal is registration, not specific syntax.

- [ ] **Step 6: Export from the capabilities barrel**

Open `packages/plugins/plugin-assistant/src/capabilities/index.ts` and add (preserving alphabetical order if the file uses it):

```ts
export { default as AnthropicIntegrationProvider } from './anthropic-integration-provider';
```

- [ ] **Step 7: Translations (conditional — only if plugin-assistant uses translation indirection in schema annotations)**

Check `packages/plugins/plugin-assistant/src/translations/`. If existing schema annotations (`title`, `description`) elsewhere in the plugin reference translation keys (look for `t(...)` wrappers or annotation-token patterns), add the following entries per locale; if the plugin uses raw English strings inline, **skip this step** and note it in the PR description.

```json
{
  "anthropic provider label": "Anthropic",
  "anthropic provider description": "Use your own Anthropic API key for AI calls in this space.",
  "anthropic token title": "API key",
  "anthropic token description": "Your Anthropic API key (starts with `sk-ant-`).",
  "anthropic invalid key": "Anthropic rejected the key as invalid."
}
```

- [ ] **Step 8: Run the test, expect pass**

Run: `moon run plugin-assistant:test -- packages/plugins/plugin-assistant/src/capabilities/anthropic-integration-provider.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 9: Run the assistant build & lint**

Run: `moon run plugin-assistant:lint -- --fix`
Then: `moon run plugin-assistant:build`
Expected: PASS for both.

- [ ] **Step 10: Commit**

```bash
cd /Users/mykola/dev/dxos/.claude/worktrees/eager-noyce-ab89ce
git add packages/plugins/plugin-assistant/
git commit -m "feat(plugin-assistant): register Anthropic IntegrationProvider for BYOK"
```

---

## Task 3b: dxos — wire the page-side AI service through `byokHeaderLayer`

Task 2 only wires BYOK on the **worker/function** side (via `InternalAiServiceLayer` in `protocol.ts`). The Composer chat sidebar talks to the edge through a *different* layer graph — `plugin-assistant`'s `edge-model-resolver.ts` and `ai-service.ts`. This task makes that path attach `X-BYOK` per-space.

**Files:**
- Modify: `packages/sdk/app-toolkit/src/capabilities.ts` — widen the `AppCapabilities.AiModelResolver` capability tag so a resolver layer can carry a `Credential.CredentialsService` requirement.
- Modify: `packages/plugins/plugin-assistant/src/capabilities/edge-model-resolver.ts` — drop the `as Layer<…, never, never>` cast that silenced the requirement, remove the now-unused `AiModelResolver` import.
- Modify: `packages/plugins/plugin-assistant/src/capabilities/ai-service.ts` — change the AI-service `LayerSpec` to `affinity: 'space'` + `requires: [Credential.CredentialsService]`; wrap the deprecated `AppCapabilities.AiServiceLayer` contribution with `configuredCredentialsLayer([])` so its `R` stays `never` (storybook + comment-thread agent fallback, no BYOK on that path).

- [x] **Step 1: Widen the `AiModelResolver` capability tag**

In `packages/sdk/app-toolkit/src/capabilities.ts`, add `Credential` to the `@dxos/compute` import and change the `AiModelResolver` capability's `Layer$.Layer<AiModelResolver$.AiModelResolver>` to `Layer$.Layer<AiModelResolver$.AiModelResolver, never, Credential.CredentialsService>`. Document why with a comment. `Layer<…, never, never>` is contravariantly assignable to the new shape, so existing contributors (LMStudio, Ollama, storybook resolvers) keep typechecking.

- [x] **Step 2: Drop the cast in `edge-model-resolver.ts`**

Remove the `as Layer.Layer<AiModelResolver.AiModelResolver, never, never>` cast at the end of the `anthropicResolverLayer` `.pipe(...)` chain. Remove the `AiModelResolver` import which becomes unused. Add a comment above `EdgeModelResolverCapabilities` explaining that the contributed layer carries a `Credential.CredentialsService` requirement (the LayerSpec graph supplies it).

- [x] **Step 3: Update the `ai-service.ts` LayerSpec**

Add `Credential` to the `@dxos/compute` import and `configuredCredentialsLayer` to the `@dxos/functions` import. Drop the explicit `: Layer.Layer<AiService.AiService>` annotation on `aiServiceLayer` (its real type is now `Layer<AiService, never, CredentialsService>`). Change the `LayerSpec.make` call to:

```ts
const aiServiceSpec = LayerSpec.make(
  {
    affinity: 'space',
    requires: [Credential.CredentialsService],
    provides: [AiService.AiService],
  },
  () => aiServiceLayer,
);
```

Wrap the deprecated contribution: `Capability.contributes(AppCapabilities.AiServiceLayer, aiServiceLayer.pipe(Layer.provide(configuredCredentialsLayer([]))))` — comment that BYOK is intentionally absent on the legacy path (mirroring `protocol.ts:208-210`).

- [x] **Step 4: Verify the type system caught it**

Force-recompile downstream consumers to confirm no hidden cast remained:

```bash
moon run app-toolkit:compile plugin-assistant:compile plugin-thread:compile plugin-client:compile composer-app:compile --force
```

All five must succeed. `plugin-assistant:compile` (not `:build`) is the right check here — `:build` is red on this branch due to pre-existing TS errors in `integration-provider.test.ts` that are unrelated to this task.

- [x] **Step 5: Confirm the original crash is gone**

Restart `moon run composer-app:serve`, open the assistant chat in a space that has an Anthropic integration set up, and submit a message. Then:

```bash
grep -c "Service not found: @dxos/functions/CredentialsService" packages/apps/composer-app/app.log
```

Must be `0` for runs after the rebuild. Compare to before: the pre-fix log showed this error on every AI request (see `packages/plugins/plugin-assistant/src/processor/processor.ts:253` `request failed` traces).

- [x] **Step 6: Commit**

```bash
cd /Users/mykola/dev/dxos/.claude/worktrees/eager-noyce-ab89ce
git add packages/sdk/app-toolkit/src/capabilities.ts \
        packages/plugins/plugin-assistant/src/capabilities/edge-model-resolver.ts \
        packages/plugins/plugin-assistant/src/capabilities/ai-service.ts
git commit -m "fix(plugin-assistant): provide CredentialsService to page-side AI requests (DX-979)"
```

---

# Phase B — edge repo

## Task 4: edge — extend metering with `keySource` dimension

**Files:**
- Modify: `packages/sdk/edge-platform/src/metering.ts`

- [ ] **Step 1: Add `keySource` to `AiMeterEvent` type**

In `/Users/mykola/dev/edge/.claude/worktrees/dx-979-byok/packages/sdk/edge-platform/src/metering.ts` replace the `AiMeterEvent` block (currently lines 78–93) with:

```ts
/** Which API key was used for the upstream call. `byok` = a per-space access token supplied by the client; `server` = the worker-deployed default. */
export type AiKeySource = 'server' | 'byok';

export type AiMeterEvent = {
  type: 'ai';
  spaceId: string;
  identityKey?: string;
  model: string;
  provider: string;
  status: AiMeterStatus;
  priceVersion: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  costUsd: number;
  /** Client tag from X-DXOS-Client-Tag header. */
  tag?: string;
  /** Which API key was used; defaults to `'server'` if omitted. */
  keySource?: AiKeySource;
};
```

- [ ] **Step 2: Extend the slot-map comment**

Replace the top-of-file slot-mapping doc block (currently lines 11–32) with the same content plus a `blob10` line:

```ts
/**
 * Analytics Engine slot mapping (single `metering` dataset):
 *
 * index1: spaceId (or 'anonymous').
 * blob1:  event type ('http' | 'ws' | 'alarm' | 'ai').
 * blob2:  operation (HTTP route) | 'ws-message' | DO class name | model (ai).
 * blob3:  worker environment.
 * blob4:  identityKey.
 * blob5:  HTTP status text (http only).
 * blob6:  client tag (from X-DXOS-Client-Tag header, '' when absent).
 * blob7:  provider (ai only).
 * blob8:  status (ai only): 'ok' | 'usage_missing' | 'error'.
 * blob9:  price_version (ai only).
 * blob10: key_source (ai only): 'server' | 'byok'.
 * double1: statusCode (http) | messageSizeBytes (ws) | durationMs (alarm).
 * double2: durationMs (http only).
 * double3: responseSizeBytes (http only).
 * double4: input tokens (ai only).
 * double5: output tokens (ai only).
 * double6: cache creation input tokens (ai only).
 * double7: cache read input tokens (ai only).
 * double8: cost_usd (ai only).
 */
```

- [ ] **Step 3: Write `keySource` as the 10th blob**

In `packages/sdk/edge-platform/src/metering.ts`, replace the `case 'ai':` branch (currently lines 131–156) with:

```ts
    case 'ai':
      METERING.writeDataPoint({
        indexes: [spaceId],
        blobs: [
          'ai',
          event.model,
          WORKER_ENV,
          event.identityKey ?? '',
          '',
          event.tag ?? '',
          event.provider,
          event.status,
          event.priceVersion,
          event.keySource ?? 'server',
        ],
        doubles: [
          0,
          0,
          0,
          event.inputTokens,
          event.outputTokens,
          event.cacheCreationInputTokens,
          event.cacheReadInputTokens,
          event.costUsd,
        ],
      });
      break;
```

- [ ] **Step 4: Build to catch type errors**

Run: `moon run edge-platform:build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/mykola/dev/edge/.claude/worktrees/dx-979-byok
git add packages/sdk/edge-platform/src/metering.ts
git commit -m "feat(edge-platform): add keySource dimension to AI metering"
```

---

## Task 5: edge — `AnthropicMeteringContext` accepts `keySource` and forwards it

**Files:**
- Modify: `packages/services/ai-service/src/anthropic-metering.ts`

- [ ] **Step 1: Add `keySource` to `AnthropicMeteringContext`**

In `/Users/mykola/dev/edge/.claude/worktrees/dx-979-byok/packages/services/ai-service/src/anthropic-metering.ts`, replace the existing import line (line 5):

```ts
import { type AiMeterStatus, writeMetering } from '@dxos/edge-platform';
```

with:

```ts
import { type AiKeySource, type AiMeterStatus, writeMetering } from '@dxos/edge-platform';
```

Then replace `AnthropicMeteringContext` (currently lines 16–21):

```ts
export type AnthropicMeteringContext = {
  identityKey?: string;
  spaceId?: string;
  tag?: string;
  provider?: string;
};
```

with:

```ts
export type AnthropicMeteringContext = {
  identityKey?: string;
  spaceId?: string;
  tag?: string;
  provider?: string;
  /** Which key was used to call upstream. */
  keySource?: AiKeySource;
};
```

- [ ] **Step 2: Pass `keySource` into `writeMetering`**

Inside `emitAiMetering` (currently lines 45–70), add `keySource: params.context.keySource,` to the `writeMetering` call after `tag:`. Final shape:

```ts
const emitAiMetering = (params: {
  context: AnthropicMeteringContext;
  model: string;
  status: AiMeterStatus;
  usage?: AnthropicTokenUsage;
}) => {
  const usage = params.usage ?? emptyAnthropicUsage();
  const costUsd =
    params.status === 'ok' && hasAnthropicUsage(params.usage) ? computeAnthropicCostUsd(params.model, usage) : 0;

  writeMetering({
    type: 'ai',
    spaceId: params.context.spaceId,
    identityKey: params.context.identityKey,
    model: params.model,
    provider: params.context.provider ?? 'anthropic',
    status: params.status,
    priceVersion: ANTHROPIC_PRICE_VERSION,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cacheCreationInputTokens: usage.cacheCreationInputTokens,
    cacheReadInputTokens: usage.cacheReadInputTokens,
    costUsd,
    tag: params.context.tag,
    keySource: params.context.keySource,
  });
};
```

- [ ] **Step 3: Build to catch type errors**

Run: `moon run ai-service:build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd /Users/mykola/dev/edge/.claude/worktrees/dx-979-byok
git add packages/services/ai-service/src/anthropic-metering.ts
git commit -m "feat(ai-service): propagate keySource through AnthropicMeteringContext"
```

---

## Task 6: edge — `proxyAnthropicRoute` reads `X-BYOK`, falls back to env

**Files:**
- Modify: `packages/services/ai-service/src/api.ts`

- [ ] **Step 1: Implement X-BYOK precedence**

In `/Users/mykola/dev/edge/.claude/worktrees/dx-979-byok/packages/services/ai-service/src/api.ts`, replace the body of `proxyAnthropicRoute` (currently lines 174–196) with:

```ts
const proxyAnthropicRoute = (
  c: Context<{ Bindings: Env; Variables: Variables }>,
  prefix: string,
): Promise<Response> => {
  const byokHeader = c.req.header('X-BYOK')?.trim();
  const useByok = byokHeader !== undefined && byokHeader.length > 0;
  const apiKey =
    (useByok ? byokHeader : c.env.ANTHROPIC_API_KEY) ?? failedInvariant('ANTHROPIC_API_KEY is not set');
  const userIdentity = c.get('userIdentity');
  const tag = c.req.header(EDGE_CLIENT_TAG_HEADER) ?? undefined;
  return proxyAnthropicRequest(c.req.raw, {
    apiKey,
    prefix,
    gateway: {
      accountId: c.env.CF_ACCOUNT_ID,
      gatewayName: c.env.AI_GATEWAY,
    },
    metadata: {
      identityKey: userIdentity,
    },
    metering: {
      identityKey: userIdentity,
      tag,
      keySource: useByok ? 'byok' : 'server',
    },
  });
};
```

- [ ] **Step 2: Build to catch type errors**

Run: `moon run ai-service:build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
cd /Users/mykola/dev/edge/.claude/worktrees/dx-979-byok
git add packages/services/ai-service/src/api.ts
git commit -m "feat(ai-service): honor X-BYOK header and tag metering keySource"
```

---

# Phase C — verification, PRs

## Task 7: Manual end-to-end verification

- [ ] **Step 1: Start local edge ai-service with BYOK branch**

In a separate terminal:

```bash
cd /Users/mykola/dev/edge/.claude/worktrees/dx-979-byok
moon run ai-service:dev
```

Note the local URL (typically `http://localhost:8787`). Make sure `ANTHROPIC_API_KEY` is set in the local dev env so the fallback path is testable.

- [ ] **Step 2: Point Composer at local edge**

Add (or update) a `runtime.services.ai.server` entry in the local Composer config (`packages/apps/composer-app/composer.config.local.yml` or equivalent) pointing to the local edge URL.

- [ ] **Step 3: Start Composer**

```bash
cd /Users/mykola/dev/dxos/.claude/worktrees/eager-noyce-ab89ce
moon run composer-app:serve --quiet
```

- [ ] **Step 4: Add the Anthropic integration in a space**

Open `http://localhost:5173`, create or open a space, and use the existing "Create integration" flow that plugin-integration already exposes (same UX as adding a Discord bot). When the provider picker opens, "Anthropic" should appear in the dropdown. Pick it, paste a valid `sk-ant-…` key, submit.

Expected: an `Integration` and `AccessToken` object are created in the space; no console errors.

- [ ] **Step 5: Send a chat message — BYOK path (measurable goal)**

This is the success criterion stated at the top of the plan.

In the assistant chat, send 3 messages in a row (e.g. "hi", "what is 2+2?", "tell me a haiku"). For **every** one of them:

a. In Composer's DevTools → Network, locate the outbound request initiated by the assistant chat (the request URL contains `/ai/generate/anthropic` or `/provider/anthropic/messages` — depending on whether you point at edge or hit the worker directly). Confirm Request Headers include `X-BYOK: sk-ant-…` matching the key pasted in Step 4.
b. In the local edge dev terminal log (or with a temporary `console.log(c.req.header('X-BYOK'))` at the top of `proxyAnthropicRoute`), confirm the worker observed the header on each request.
c. Confirm the upstream Anthropic request the worker emits uses the BYOK value as `x-api-key`.

If even one of the 3 requests is missing the header, the page-side pipeline is broken — re-check the "regression checklist" in the **Page-side BYOK pipeline** section and look for a `Service not found: @dxos/functions/CredentialsService` entry in `app.log`.

- [ ] **Step 6: Delete the integration and re-test — server path**

Delete the Anthropic `Integration` object from the space. Send another chat message. Verify the request to edge no longer carries `X-BYOK` and the worker falls back to `ANTHROPIC_API_KEY`.

- [ ] **Step 7: Verify metering keySource locally**

Since `METERING` (AnalyticsEngineDataset) may not be bound in local dev, temporarily add a `console.log(event)` line in `packages/sdk/edge-platform/src/metering.ts` immediately before the `switch (event.type)` in `writeMetering`. Confirm `'byok'` then `'server'` are emitted across the two runs. Revert the log before committing.

If a working Anthropic key is not on hand, skip Steps 5–6 and document the gap on the PR — build-level signoff is acceptable for the initial merge.

---

## Task 8: dxos — push branch and open PR

- [ ] **Step 1: Sync with main**

```bash
cd /Users/mykola/dev/dxos/.claude/worktrees/eager-noyce-ab89ce
git fetch origin main
git merge origin/main
```

Resolve any conflicts; rerun `moon run :lint -- --fix` and `moon run :test` over touched packages (`plugin-assistant`, `functions`).

- [ ] **Step 2: Cast audit**

Run: `git diff origin/main | grep -nE '\bas (any|unknown|[A-Z])|as unknown as'`
Expected: no new entries. Address each that appears.

- [ ] **Step 3: Push and open PR**

```bash
cd /Users/mykola/dev/dxos/.claude/worktrees/eager-noyce-ab89ce
git push -u origin HEAD
gh pr create --title "feat(plugin-assistant): BYOK Anthropic integration (DX-979)" --body "$(cat <<'EOF'
## Summary
- `plugin-assistant` registers an `IntegrationProvider` for Anthropic (`source = anthropic.com`, `providerId = anthropic`) mirroring the Discord bot integration pattern. Users add the integration via the standard "Create integration" flow in a space — no new UI surface.
- A non-OAuth `credentialForm` accepts an Anthropic API key, validates it against `GET https://api.anthropic.com/v1/models`, and writes a paired `AccessToken` + `Integration` into the space.
- New `byokHeaderLayer('anthropic.com')` Effect Layer attaches `X-BYOK` to outbound AI HTTP traffic from `FunctionsAiHttpClient` whenever the space has a matching credential. Wired into `InternalAiServiceLayer`.
- Companion edge change (dxos/edge#XXX) reads `X-BYOK`, prefers it over the server's `ANTHROPIC_API_KEY`, and tags the path in Cloudflare Analytics Engine (`keySource` blob).

closes DX-979

## Test plan
- [ ] `moon run plugin-assistant:test` passes locally
- [ ] `moon run functions:test` passes locally
- [ ] Manual: add Anthropic integration in a space → chat request to edge carries `X-BYOK`; delete it → falls back to server key
- [ ] Edge Analytics Engine `blob10` distinguishes `byok` vs `server`
EOF
)"
```

Replace `dxos/edge#XXX` with the actual edge PR number from Task 9.

- [ ] **Step 4: Check CI and respond to review comments**

```bash
gh run list --branch $(git rev-parse --abbrev-ref HEAD) --limit 3 --workflow "Check"
```

Fix failures at the root. Address every PR review comment.

---

## Task 9: edge — push branch and open PR

- [ ] **Step 1: Push the edge branch**

```bash
cd /Users/mykola/dev/edge/.claude/worktrees/dx-979-byok
git push -u origin claude/dx-979-byok-x-header
```

- [ ] **Step 2: Open a draft PR**

```bash
cd /Users/mykola/dev/edge/.claude/worktrees/dx-979-byok
gh pr create --draft --title "feat(ai-service): honor X-BYOK header from clients" --body "$(cat <<'EOF'
## Summary
- `proxyAnthropicRoute` now reads `X-BYOK` from the incoming request; when non-empty it is used as the Anthropic `x-api-key` instead of the server-side `ANTHROPIC_API_KEY`.
- New `keySource: 'server' | 'byok'` dimension on AI metering events (Cloudflare Analytics Engine `blob10`).

Part of DX-979 — the Composer client change lives in the dxos repo (dxos/dxos#XXX).

## Test plan
- [ ] `moon run :build` passes locally
- [ ] After deploy, manual: send a chat with no X-BYOK → server path; send with `X-BYOK: sk-ant-…` → BYOK path; verify Analytics Engine blob10 distinguishes them
EOF
)"
```

Replace `dxos/dxos#XXX` with the actual dxos PR number from Task 8.

- [ ] **Step 3: Verify CI is green**

```bash
cd /Users/mykola/dev/edge/.claude/worktrees/dx-979-byok
gh run list --branch claude/dx-979-byok-x-header --limit 5
```

Wait until CI reports success. If anything fails, inspect with `gh run view <id> --log-failed` and fix at the root.

---

## Self-Review

Reviewed plan against spec on 2026-06-03:

1. **Spec coverage:**
   - Token in space → standard `AccessToken` + `Integration` pair created by the Anthropic `IntegrationProvider`'s `credentialForm` (Task 3).
   - `X-BYOK` header on Composer side → `byokHeaderLayer('anthropic.com')` + wiring in `InternalAiServiceLayer` (Tasks 1, 2).
   - Edge honors `X-BYOK`, falls back to server key → Task 6.
   - Separate metering for BYOK vs server in Cloudflare Analytics Engine → Tasks 4, 5, 6 (`keySource` dimension, blob10).
   - "Integration tab in space settings" → fully covered by existing plugin-integration UI; the new Anthropic provider appears in the provider picker once `plugin-assistant` is enabled.
   - Both ends (dxos + edge) covered; both worktrees created up-front; dxos work lands first to keep the PR review surface focused.

2. **Test posture:**
   - dxos side has full TDD coverage (byokHeaderLayer + credentialForm).
   - edge side intentionally relies on build-level type checks + manual E2E (Task 7); the proposed unit tests were judged low value relative to the cost of exposing internals for testing.

3. **Type consistency:**
   - `keySource: 'server' | 'byok'` identical across `metering.ts` (Task 4), `anthropic-metering.ts` (Task 5), `api.ts` (Task 6).
   - `ANTHROPIC_SOURCE = 'anthropic.com'` is the single source of truth: used by the IntegrationProvider in Task 3, matched by `byokHeaderLayer('anthropic.com')` in Task 2, consistent with the Discord pattern (`source = 'discord.com'`).
   - `ANTHROPIC_PROVIDER_ID = 'anthropic'` is used as `Integration.providerId` in Task 3's `onSubmit` result.

4. **Open spots (intentional, bounded):**
   - Task 3 Step 4: implementer must mirror Discord's exact `Obj.refOf`/`Ref.make` idiom (named adjacent file).
   - Task 3 Step 7 (translations): keep or drop depending on how plugin-assistant currently wires translations.

5. **Risks to surface on PR:**
   - Token visibility: the `Integration`/`AccessToken` are space-scoped and visible to all members. This is the existing contract for `plugin-integration`; per-user privacy would need a follow-up.
   - Validation endpoint: `validateAnthropicKey` calls `https://api.anthropic.com/v1/models` directly from the browser. If CORS blocks the call, save still proceeds; flip to a server-side validation route in a follow-up if needed.
   - Multiple Anthropic tokens in the same space: `byokHeaderLayer` uses `matches[0]`. Acceptable for v1.

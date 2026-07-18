//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { OAuthProvider } from '@dxos/edge-protocol';
import { EffectEx } from '@dxos/effect';
import { EntityId, PublicKey, SpaceId } from '@dxos/keys';

import { createEphemeralEdgeIdentity } from './auth';
import { type EdgeApiClient, makeEdgeApiClient } from './edge-api-client';
import { EdgeRequestError } from './edge-api-errors';
import { EdgeApiService, mapEdgeErrors } from './edge-client-service';
import { type EdgeIdentity } from './edge-identity';

/**
 * Live end-to-end coverage of the Effect `HttpApi`-derived edge client (`makeEdgeApiClient` /
 * `EdgeApiService`) against a real running edge worker (`wrangler dev`). Walks every group in
 * `@dxos/edge-protocol`'s `EdgeApi` contract, exercising the happy path where the local dev
 * environment supports it and asserting typed graceful failures elsewhere (missing OAuth
 * secrets, disabled test endpoints, admin-key-gated routes, etc).
 *
 * The former client-side "contract gap" endpoints (`db.spaceCreate`, `db.identityRecover`,
 * `db.spaceExport`, `db.spaceExecQuery`, `db.queueBlocksQuery`, `blob.blobUpload`/`blobUploadCar`)
 * now declare real `.setPayload(...)`/`.addSuccess(..., { status })` contracts, so the derived
 * client can attach a body and decode a real insert response for every one of them — those tests
 * below now exercise the real handler rather than a client-side "no payload channel" failure.
 * `db.registryModules` remains a genuine, documented client-side limitation (see the `registry`
 * describe block) since it depends on an upstream `@effect/platform` fix for wildcard path
 * segments.
 *
 * Skipped entirely unless `DX_EDGE_TEST_URL` is set, since it requires a live edge instance:
 *
 *   DX_EDGE_TEST_URL=http://localhost:8787 moon run edge-client:test -- edge-api.e2e.test.ts
 *
 * With the var unset, every test in this file is skipped (not run, not failed).
 */
const EDGE_URL = process.env.DX_EDGE_TEST_URL;

describe.skipIf(!EDGE_URL)('edge api (live)', { tags: ['sync-e2e'], timeout: 60_000 }, () => {
  let identity: EdgeIdentity;
  // Queue/indexer/exec-query routes key their Durable Objects by `spaceId` alone (no
  // `spaceCreate` precondition — see the `db` describe block below), so a single random space id
  // shared across describes stands in for a "created" space throughout this file. `spaceCreate`
  // itself can no longer mint a real one to promote this to in this local dev instance — see the
  // `db` describe block's `spaceCreate` test for why — so this stays a random id rather than a
  // real created space's id.
  const spaceId = SpaceId.random();

  beforeAll(async () => {
    identity = await createEphemeralEdgeIdentity();
  });

  const anonymousClient = () => makeEdgeApiClient(EDGE_URL!);

  const authedCall = <A>(run: (client: EdgeApiClient) => Effect.Effect<A, unknown, never>) =>
    Effect.gen(function* () {
      const { client } = yield* EdgeApiService;
      return yield* mapEdgeErrors(run(client));
    }).pipe(Effect.provide(EdgeApiService.layer({ baseUrl: EDGE_URL!, clientTag: 'edge-api-e2e', identity })));

  describe('status', () => {
    test('health reports ok', async ({ expect }) => {
      const response = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* client.status.health();
        }),
      );
      expect(response.data.status).toBe('ok');
    });

    test('auth returns an identity key for a presented credential', async ({ expect }) => {
      const response = await EffectEx.runPromise(authedCall((client) => client.status.auth()));
      expect(typeof response.data.identityKey).toBe('string');
      expect(response.data.identityKey.length).toBeGreaterThan(0);
    });

    test('systemStatus returns a success envelope', async ({ expect }) => {
      const response = await EffectEx.runPromise(authedCall((client) => client.status.systemStatus()));
      expect(response.success).toBe(true);
    });

    // `ENABLE_TEST_ENDPOINTS` is off in this local dev instance, so `guardTestEndpoint` answers
    // with a 404 for every `/test/*` route — assert the typed failure rather than a crash.
    test('testTraceContext fails gracefully when test endpoints are disabled', async ({ expect }) => {
      const error = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(client.status.testTraceContext());
        }).pipe(Effect.flip),
      );
      expect(error).toBeInstanceOf(EdgeRequestError);
    });
  });

  describe('router', () => {
    // The `@dxos/router` ICE server list is sourced from a TURN provider that isn't configured
    // in this local dev instance, so this may 500 — accept either a populated list or the
    // graceful failure, but not a crash.
    test('ice returns a non-empty list of ICE servers, or fails gracefully', async ({ expect }) => {
      const outcome = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(client.router.ice()).pipe(Effect.either);
        }),
      );
      if (outcome._tag === 'Right') {
        expect(outcome.right.iceServers.length).toBeGreaterThan(0);
      } else {
        expect(outcome.left).toBeInstanceOf(EdgeRequestError);
      }
    });
  });

  describe('kms', () => {
    // The atproto client metadata document is built from env-configured OAuth client settings
    // that aren't present in this local dev instance, so this may 500 — accept either shape.
    test('atprotoClientMetadata returns the OAuth client metadata document, or fails gracefully', async ({
      expect,
    }) => {
      const outcome = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(client.kms.atprotoClientMetadata()).pipe(Effect.either);
        }),
      );
      if (outcome._tag === 'Right') {
        expect(typeof outcome.right.client_id).toBe('string');
      } else {
        expect(outcome.left).toBeInstanceOf(EdgeRequestError);
      }
    });

    // No OAuth provider secrets are configured in this local dev instance, so initiating a real
    // flow fails — assert the typed error rather than a successful `authUrl`.
    test('oauthInitiate fails gracefully without provider configuration', async ({ expect }) => {
      const error = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(
            client.kms.oauthInitiate({
              payload: {
                provider: OAuthProvider.GITHUB,
                spaceId: SpaceId.random(),
                accessTokenId: 'e2e-test-token',
                scopes: [],
              },
            }),
          );
        }).pipe(Effect.flip),
      );
      expect(error).toBeInstanceOf(EdgeRequestError);
    });

    // `oauthRegistrationComplete`, `atprotoProxy`, and `oauthCallback` all require a completed
    // real OAuth provider round trip (a registration token / access token minted by that
    // provider) that can't be fabricated from a local dev instance — not covered here.
  });

  describe('registry', () => {
    test('registryHealth reports ok', async ({ expect }) => {
      const response = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* client.registry.registryHealth();
        }),
      );
      expect(response.data.ok).toBe(true);
    });

    test('registryPlugins returns the plugin index or a warming-up failure', async ({ expect }) => {
      const outcome = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(client.registry.registryPlugins()).pipe(Effect.either);
        }),
      );
      if (outcome._tag === 'Right') {
        expect(outcome.right.data.version).toBe(2);
        expect(Array.isArray(outcome.right.data.plugins)).toBe(true);
      } else {
        // Indexer not yet warmed up in this dev instance.
        expect(outcome.left).toBeInstanceOf(EdgeRequestError);
      }
    });

    test('registryUpload stores a fixture bundle', async ({ expect }) => {
      const slug = `e2e-test-plugin-${Date.now()}`;
      const version = '0.0.1';
      const content = 'export default 1;\n';
      const upload = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(
            client.registry.registryUpload({
              payload: { slug, version, files: [{ path: 'index.js', content: btoa(content) }] },
            }),
          );
        }),
      );
      expect(upload.data.moduleUrl).toContain(`${slug}/${version}/manifest.json`);
    });

    test('registryModules round-trips uploaded content via a plain fetch (bypassing the derived client)', async ({
      expect,
    }) => {
      const slug = `e2e-test-plugin-${Date.now()}`;
      const version = '0.0.1';
      const content = 'export default 2;\n';
      await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(
            client.registry.registryUpload({
              payload: { slug, version, files: [{ path: 'index.js', content: btoa(content) }] },
            }),
          );
        }),
      );

      // See the `registryModules` (contract gap) test below for why this route can't be addressed
      // through the derived client — a plain `fetch` against the real served path round-trips the
      // uploaded content instead.
      const response = await fetch(`${EDGE_URL}/registry/modules/${slug}/${version}/index.js`);
      expect(response.ok).toBe(true);
      expect(await response.text()).toBe(content);
    });

    // `RegistryModulesPathSchema`'s trailing `'*'` field is meant to capture a nested subpath
    // (e.g. `chunks/foo.js`), but `@effect/platform`'s `HttpApiClient.compilePath` only
    // interpolates named `:param` segments (`/:(\w+)\??/g`) — a literal `'*'` in the path template
    // is never substituted with the caller's value, so the derived client always requests the
    // literal path `/registry/modules/<slug>/<version>/*`, which 404s. This is a real client-side
    // limitation (not specific to this endpoint's server-side handler) — assert the resulting
    // typed failure rather than a successful round trip.
    test('registryModules cannot address a nested asset through the derived client (contract gap)', async ({
      expect,
    }) => {
      const error = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(
            client.registry.registryModules({ path: { 'slug': 'nonexistent', 'version': '0.0.1', '*': 'index.js' } }),
          );
        }).pipe(Effect.flip),
      );
      expect(error).toBeInstanceOf(EdgeRequestError);
    });

    test('registryBackfill responds without crashing', async ({ expect }) => {
      const outcome = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(client.registry.registryBackfill()).pipe(Effect.either);
        }),
      );
      // `RegistryIndexer` may not be bound in this dev instance — either a success envelope or a
      // typed 503 is acceptable; a defect/crash is not.
      if (outcome._tag === 'Right') {
        expect(outcome.right.success).toBe(true);
      } else {
        expect(outcome.left).toBeInstanceOf(EdgeRequestError);
      }
    });
  });

  describe('jetstream', () => {
    test('jetstreamHealth reports ok', async ({ expect }) => {
      const response = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* client.jetstream.jetstreamHealth();
        }),
      );
      expect(response.data.ok).toBe(true);
    });

    test('jetstreamStatus returns a status object', async ({ expect }) => {
      const response = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* client.jetstream.jetstreamStatus();
        }),
      );
      expect(typeof response).toBe('object');
    });
  });

  describe('agents', () => {
    // A fresh ephemeral identity has no real HALO space, so `createAgent` can't supply a valid
    // `haloSpaceId`/`haloSpaceKey` pair — assert the graceful typed failure rather than a
    // fabricated success.
    // This local dev instance doesn't verify that `haloSpaceId`/`haloSpaceKey` correspond to a
    // real HALO space, so `createAgent` actually succeeds for a fabricated pair — assert the
    // real response shape instead of a fabricated failure.
    test('createAgent succeeds and mints a device/feed key pair', async ({ expect }) => {
      const response = await EffectEx.runPromise(
        authedCall((client) =>
          client.agents.createAgent({
            payload: {
              identityDid: identity.identityDid,
              haloSpaceId: SpaceId.random(),
              haloSpaceKey: PublicKey.random().toHex(),
            },
          }),
        ),
      );
      expect(typeof response.data.deviceKey).toBe('string');
      expect(typeof response.data.feedKey).toBe('string');
    });

    // Runs after `createAgent` above, which did mint an agent for `identity` — so the status here
    // reflects a freshly created (not-yet-connected) agent rather than a never-created one.
    test('agentStatus reports a valid status for the identity', async ({ expect }) => {
      const response = await EffectEx.runPromise(
        authedCall((client) => client.agents.agentStatus({ path: { identity: identity.identityDid } })),
      );
      expect(['active', 'inactive', 'not_found']).toContain(response.data.agent.status);
    });
  });

  describe('db', () => {
    // `spaceCreate`'s `HttpApiEndpoint` now declares `.setPayload(CreateSpaceRequestSchema)`, so
    // the derived client can attach the real `{ agentKey }` body — verified below by minting a
    // real agent first and observing the handler's real business-logic response rather than a
    // client-side "no payload channel" failure. This local dev instance runs with
    // `subductionReplicator.enabled: true` (see edge's `wrangler.jsonc`), under which
    // `SpaceHandler.createSpace` unconditionally refuses server-side space creation — space roots
    // are meant to be created and synced by the client under subduction, not minted by the edge
    // worker — so a real space can never actually be created through this endpoint in this
    // environment. That's a real, intentional business rule (not a contract gap), so the test
    // below asserts the specific graceful failure message rather than a successful creation. The
    // queue/indexer/exec-query routes below key their Durable Objects by `spaceId` alone (no
    // `spaceCreate` precondition) — see the shared `spaceId` declared above.
    const subspaceTag = 'data' as const;
    const queueId = EntityId.random();

    test('spaceCreate sends its payload and hits the real subduction-replication business rule', async ({ expect }) => {
      const agent = await EffectEx.runPromise(
        authedCall((client) =>
          client.agents.createAgent({
            payload: {
              identityDid: identity.identityDid,
              haloSpaceId: SpaceId.random(),
              haloSpaceKey: PublicKey.random().toHex(),
            },
          }),
        ),
      );
      const error = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(client.db.spaceCreate({ payload: { agentKey: agent.data.deviceKey } }));
        }).pipe(Effect.flip),
      );
      expect(error).toBeInstanceOf(EdgeRequestError);
      expect(error.message).toContain('subduction replication');
    });

    test('notarizationGet returns the awaiting-notarization set for a space', async ({ expect }) => {
      const response = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* client.db.notarizationGet({ path: { spaceId } });
        }),
      );
      expect(response).toBeDefined();
    });

    // `queueInsert`'s handler responds `EdgeResponse.success({}, 201)`, and its `HttpApiEndpoint`
    // now declares the matching `.addSuccess(Schema.Unknown, { status: 201 })` — the derived
    // client decodes the real insert response instead of surfacing a generic decode failure.
    test('queue insert, query, and delete round-trip two objects', async ({ expect }) => {
      const objectA = { id: EntityId.random(), value: 'a' };
      const objectB = { id: EntityId.random(), value: 'b' };

      const insertOutcome = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(
            client.db.queueInsert({
              path: { subspaceTag, spaceId, queueId },
              payload: { objects: [objectA, objectB] },
            }),
          ).pipe(Effect.either);
        }),
      );
      expect(insertOutcome._tag).toBe('Right');

      const queried = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(client.db.queueQuery({ path: { subspaceTag, spaceId, queueId }, urlParams: {} }));
        }),
      );
      expect(JSON.stringify(queried)).toContain(objectA.id);
      expect(JSON.stringify(queried)).toContain(objectB.id);

      await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(
            client.db.queueDelete({
              path: { subspaceTag, spaceId, queueId },
              urlParams: { ids: [objectA.id, objectB.id] },
            }),
          );
        }),
      );

      const afterDelete = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(client.db.queueQuery({ path: { subspaceTag, spaceId, queueId }, urlParams: {} }));
        }),
      );
      // Deletion is a soft-delete (a tombstone entry with `@deleted: true` at a later queue
      // position) rather than removal from the response — assert the tombstone marker.
      const afterDeleteJson = JSON.stringify(afterDelete);
      expect(afterDeleteJson).toContain('"@deleted":true');
    });

    // `queueBlocksAppend` has the same handler-status fix as `queueInsert` above (its
    // `HttpApiEndpoint` now declares `.addSuccess(Schema.Unknown, { status: 201 })`), and
    // `queueBlocksQuery`'s `HttpApiEndpoint` now declares `.setPayload(Schema.Unknown)` — the
    // handler merges this body with `path.spaceId`/`path.subspaceTag` before decoding it as a
    // `FeedProtocol.QueryRequest`, whose only non-optional fields are exactly those two, so an
    // empty `{}` payload decodes successfully — so the append below can be verified through a real
    // round-trip `queueBlocksQuery` call.
    test('queueBlocksAppend appends a block, verified through queueBlocksQuery', async ({ expect }) => {
      const blockData = [1, 2, 3];
      const appendOutcome = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(
            client.db.queueBlocksAppend({
              path: { subspaceTag, spaceId },
              payload: { blocks: [{ feedId: queueId, data: blockData }] },
            }),
          ).pipe(Effect.either);
        }),
      );
      expect(appendOutcome._tag).toBe('Right');

      const queried = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(client.db.queueBlocksQuery({ path: { subspaceTag, spaceId }, payload: {} }));
        }),
      );
      expect(JSON.stringify(queried)).toContain(queueId);
    });

    // `spaceExecQuery`'s `HttpApiEndpoint` now declares `.setPayload(Schema.Unknown)`, so the
    // derived client actually transmits a body — the handler decodes it into a
    // `dxos.echo.query.QueryRequest` proto message whose `query` field must itself be a
    // JSON-encoded `QueryAST.Query` naming exactly one target space. Building a real one requires
    // `@dxos/echo-schema`'s query builders, which this package doesn't depend on, so this sends a
    // syntactically-plausible (but not `QueryAST`-valid) body and asserts the graceful typed
    // failure that reaches the client now that the payload channel exists, rather than the old
    // "no setPayload at all" contract gap.
    test('spaceExecQuery transmits its payload and fails gracefully on an unrecognized query', async ({ expect }) => {
      const error = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(
            client.db.spaceExecQuery({ path: { spaceId }, payload: { query: '{}', reactivity: 0 } }),
          );
        }).pipe(Effect.flip),
      );
      expect(error).toBeInstanceOf(EdgeRequestError);
    });

    test('spaceIndexerStatus reports a status for the space', async ({ expect }) => {
      const response = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* client.db.spaceIndexerStatus({ path: { spaceId } });
        }),
      );
      expect(response).toBeDefined();
    });

    // `spaceExport`'s `HttpApiEndpoint` now declares `.setPayload(ExportBundleRequestSchema)`, so
    // the real `{ docHeads }` body transmits. `AutomergeHandler.export` checks
    // `useSubductionReplicator` before anything else, same as `SpaceHandler.createSpace` above, so
    // this hits the same real (not contract-gap) business-rule refusal in this dev instance.
    test('spaceExport transmits its payload and hits the real subduction-replication business rule', async ({
      expect,
    }) => {
      const error = await EffectEx.runPromise(
        authedCall((client) => client.db.spaceExport({ path: { spaceId }, payload: { docHeads: {} } })).pipe(
          Effect.flip,
        ),
      );
      expect(error).toBeInstanceOf(EdgeRequestError);
      expect(error.message).toContain('subduction replication');
    });

    // `identityRecover`'s `HttpApiEndpoint` now declares `.setPayload(RecoverIdentityRequestSchema)`,
    // so a syntactically-valid-but-unknown recovery request transmits and reaches the real
    // handler, which fails gracefully rather than crashing on an unrecognized `lookupKey`.
    test('identityRecover transmits its payload and fails gracefully for a bogus request', async ({ expect }) => {
      const error = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(
            client.db.identityRecover({
              payload: {
                deviceKey: PublicKey.random().toHex(),
                controlFeedKey: PublicKey.random().toHex(),
                lookupKey: 'e2e-test-nonexistent-lookup-key',
              },
            }),
          );
        }).pipe(Effect.flip),
      );
      expect(error).toBeInstanceOf(EdgeRequestError);
    });

    // `ENABLE_TEST_ENDPOINTS` is off, so any `/test/*` route 404s — pick one representative.
    test('testSpaceMembers 404s when test endpoints are disabled', async ({ expect }) => {
      const error = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(client.db.testSpaceMembers({ path: { spaceId } }));
        }).pipe(Effect.flip),
      );
      expect(error).toBeInstanceOf(EdgeRequestError);
    });
  });

  describe('functions', () => {
    test('functionsList returns an uploaded/latest-version function summary', async ({ expect }) => {
      const response = await EffectEx.runPromise(authedCall((client) => client.functions.functionsList()));
      expect(typeof response === 'object' && response !== null && 'success' in response && response.success).toBe(true);
    });

    test('functionInvoke fails gracefully for a bogus functionId', async ({ expect }) => {
      const error = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(
            client.functions.functionInvoke({ path: { functionId: 'bogus-function-id' }, urlParams: {} }),
          );
        }).pipe(Effect.flip),
      );
      expect(error).toBeInstanceOf(EdgeRequestError);
    });

    test('triggersStatus for a fresh space responds without crashing', async ({ expect }) => {
      const outcome = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(client.functions.triggersStatus({ path: { spaceId } })).pipe(Effect.either);
        }),
      );
      if (outcome._tag === 'Left') {
        expect(outcome.left).toBeInstanceOf(EdgeRequestError);
      } else {
        expect(outcome.right).toBeDefined();
      }
    });

    test('cronsList for a fresh space responds without crashing', async ({ expect }) => {
      const outcome = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(client.functions.cronsList({ path: { spaceId } })).pipe(Effect.either);
        }),
      );
      if (outcome._tag === 'Left') {
        expect(outcome.left).toBeInstanceOf(EdgeRequestError);
      } else {
        expect(outcome.right).toBeDefined();
      }
    });

    test('workflowRun fails gracefully for a bogus workflowId', async ({ expect }) => {
      const error = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(
            client.functions.workflowRun({ path: { spaceId, workflowId: 'bogus-workflow-id' } }),
          );
        }).pipe(Effect.flip),
      );
      expect(error).toBeInstanceOf(EdgeRequestError);
    });

    test('cronRun fails gracefully for a bogus triggerId', async ({ expect }) => {
      const error = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(client.functions.cronRun({ path: { spaceId, triggerId: 'bogus-trigger-id' } }));
        }).pipe(Effect.flip),
      );
      expect(error).toBeInstanceOf(EdgeRequestError);
    });
  });

  describe('blob', () => {
    // `blobUpload` now declares a `HttpApiSchema.Uint8Array` payload (and `blobUploadCar` the
    // CAR-flavored equivalent), so the derived client can attach real bytes to the request instead
    // of always sending an empty body. `:key` is a single path segment in `BlobApiGroup`
    // (`/api/file/:key`), so the key must not contain a literal `/` — the dev-server router 404s
    // otherwise (a `/` splits it into two segments the route can't match).
    const blobKey = `e2e-test-${crypto.randomUUID()}`;
    const blobBytes = crypto.getRandomValues(new Uint8Array(128));

    test('blobUpload/blobHead/blobGet/blobDelete round-trip real bytes', async ({ expect }) => {
      await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(client.blob.blobUpload({ path: { key: blobKey }, payload: blobBytes }));
        }),
      );

      await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(client.blob.blobHead({ path: { key: blobKey } }));
        }),
      );

      // `blobGet`'s success schema is bare `Schema.Unknown` with no `HttpApiSchema.Uint8Array`
      // annotation, so the derived client falls back to its default JSON decode path (read the
      // response as text, then `JSON.parse` it) regardless of the real `Content-Type` the R2
      // object was served with — real binary bytes essentially never parse as JSON, so this call
      // fails to decode even though the server served the bytes correctly; assert that graceful
      // failure, then verify the actual byte-identical round trip with a plain `fetch` instead
      // (the same workaround the `registryModules` test above documents for its own wildcard-path
      // gap — both are genuine, real client-side limitations, not bugs in this test).
      const derivedOutcome = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(client.blob.blobGet({ path: { key: blobKey } })).pipe(Effect.either);
        }),
      );
      expect(derivedOutcome._tag).toBe('Left');

      const rawResponse = await fetch(`${EDGE_URL}/api/file/${blobKey}`);
      expect(rawResponse.ok).toBe(true);
      const rawBytes = new Uint8Array(await rawResponse.arrayBuffer());
      expect(rawBytes).toEqual(blobBytes);

      await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(client.blob.blobDelete({ path: { key: blobKey } }));
        }),
      );

      const afterDelete = await fetch(`${EDGE_URL}/api/file/${blobKey}`);
      expect(afterDelete.ok).toBe(false);
    });

    // `blobUploadCar` needs a real CAR (Content Addressable aRchive) fixture to exercise the
    // decode path meaningfully — not covered here.
  });

  describe('dataManagement', () => {
    // `spaceCreate` can never mint a real space in this local dev instance (subduction
    // replication is enabled — see the `db` describe block's `spaceCreate` test), so `identity`
    // never actually became a member of `spaceId` — `dataSpaceInspect` correctly refuses with a
    // 403 rather than leaking diagnostics to a non-member, so assert that graceful failure.
    test('dataSpaceInspect refuses for an identity that never joined the space', async ({ expect }) => {
      const error = await EffectEx.runPromise(
        authedCall((client) => client.dataManagement.dataSpaceInspect({ path: { spaceId } })).pipe(Effect.flip),
      );
      expect(error).toBeInstanceOf(EdgeRequestError);
    });

    test('dataIdentityInspect returns identity diagnostics', async ({ expect }) => {
      const response = await EffectEx.runPromise(
        authedCall((client) => client.dataManagement.dataIdentityInspect({ path: { identity: identity.identityDid } })),
      );
      expect(response).toBeDefined();
    });

    // No `DX_HUB_API_KEY` is configured locally, so admin-key-gated routes should refuse rather
    // than serve real tenant data.
    test('adminSpacesList refuses without an admin key', async ({ expect }) => {
      const error = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(client.dataManagement.adminSpacesList({ urlParams: {} }));
        }).pipe(Effect.flip),
      );
      expect(error).toBeInstanceOf(EdgeRequestError);
    });

    test('adminIdentitiesList refuses without an admin key', async ({ expect }) => {
      const error = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(client.dataManagement.adminIdentitiesList({ urlParams: {} }));
        }).pipe(Effect.flip),
      );
      expect(error).toBeInstanceOf(EdgeRequestError);
    });
  });

  describe('devtools', () => {
    test('devtoolsDurableObjectType responds in dev', async ({ expect }) => {
      const outcome = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(client.devtools.devtoolsDurableObjectType()).pipe(Effect.either);
        }),
      );
      if (outcome._tag === 'Left') {
        expect(outcome.left).toBeInstanceOf(EdgeRequestError);
      } else {
        expect(outcome.right).toBeDefined();
      }
    });

    test('devtoolsDurableObject responds in dev', async ({ expect }) => {
      const outcome = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(client.devtools.devtoolsDurableObject()).pipe(Effect.either);
        }),
      );
      if (outcome._tag === 'Left') {
        expect(outcome.left).toBeInstanceOf(EdgeRequestError);
      } else {
        expect(outcome.right).toBeDefined();
      }
    });

    test('devtoolsDurableObjectStorage responds in dev', async ({ expect }) => {
      const outcome = await EffectEx.runPromise(
        Effect.gen(function* () {
          const client = yield* anonymousClient();
          return yield* mapEdgeErrors(
            client.devtools.devtoolsDurableObjectStorage({ path: { name: 'e2e-test', id: 'e2e-test' } }),
          ).pipe(Effect.either);
        }),
      );
      if (outcome._tag === 'Left') {
        expect(outcome.left).toBeInstanceOf(EdgeRequestError);
      } else {
        expect(outcome.right).toBeDefined();
      }
    });
  });

  afterAll(async () => {
    // Best-effort cleanup — failures here shouldn't fail the suite since several of the routes
    // exercised above are documented contract gaps that never actually created durable state.
    await EffectEx.runPromise(
      Effect.gen(function* () {
        const client = yield* anonymousClient();
        yield* mapEdgeErrors(client.dataManagement.dataSpaceDelete({ path: { spaceId } })).pipe(
          Effect.catchAll(() => Effect.void),
        );
        yield* mapEdgeErrors(
          client.dataManagement.dataIdentityDelete({ path: { identity: identity.identityDid } }),
        ).pipe(Effect.catchAll(() => Effect.void));
      }),
    ).catch(() => {});
  });
});

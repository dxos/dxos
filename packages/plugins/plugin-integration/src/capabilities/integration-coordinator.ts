//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { createEdgeIdentity } from '@dxos/client/edge';
import { type Operation } from '@dxos/compute';
import { Context as DxContext } from '@dxos/context';
import { type Database, DXN, type Key, Obj, Ref } from '@dxos/echo';
import { EdgeHttpClient } from '@dxos/edge-client';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { AccessToken } from '@dxos/types';

import { IntegrationCoordinator, IntegrationProvider, type IntegrationProviderEntry } from '#types';

import {
  PROVIDER_FORM_DIALOG,
  SYNC_TARGETS_DIALOG,
  integrationDeckSubject,
  pendingIntegrationStorageKey,
} from '../constants';
import { IntegrationProviderNotFoundError, SpaceUnavailableError } from '../errors';
import { Integration } from '../types';

/** Pending integration awaiting an OAuth callback or credential-form submit. */
type Pending = {
  /**
   * AccessTokens to persist with the integration. Index 0 is the primary —
   * OAuth flows mutate this entry's `.token` field when the postMessage
   * callback arrives.
   */
  tokens: ReadonlyArray<AccessToken.AccessToken>;
  integration: Integration.Integration;
  db: Database.Database;
  provider: IntegrationProviderEntry;
  existingTarget?: Ref.Ref<Obj.Any>;
};

/**
 * Parses `postMessage` payload from the OAuth relay into a narrow result.
 * Unknown shapes are ignored so arbitrary messages do not reach domain logic.
 */
const decodeOAuthMessageData = (
  data: unknown,
):
  | { tag: 'success'; accessTokenId: string; accessToken: string }
  | { tag: 'failure'; reason: string }
  | { tag: 'invalid' } => {
  if (data === null || data === undefined || typeof data !== 'object') {
    return { tag: 'invalid' };
  }
  const record = data as Record<string, unknown>;
  if (record.success === true) {
    const accessTokenId = record.accessTokenId;
    const accessToken = record.accessToken;
    if (typeof accessTokenId === 'string' && typeof accessToken === 'string') {
      return { tag: 'success', accessTokenId, accessToken };
    }
    return { tag: 'invalid' };
  }
  if (record.success === false && typeof record.reason === 'string') {
    return { tag: 'failure', reason: record.reason };
  }
  return { tag: 'invalid' };
};

const resolveProvider = (
  getEntries: () => IntegrationProviderEntry[],
  providerId: string,
): Effect.Effect<IntegrationProviderEntry, IntegrationProviderNotFoundError> =>
  Effect.gen(function* () {
    const provider = getEntries().find((p) => p.id === providerId);
    if (!provider) {
      return yield* Effect.fail(new IntegrationProviderNotFoundError(providerId));
    }
    return provider;
  });

const openProviderFormDialog = (
  invoker: Operation.OperationService,
  input: {
    db: Database.Database;
    spaceId: Key.SpaceId;
    provider: IntegrationProviderEntry;
    existingTarget?: Ref.Ref<Obj.Any>;
  },
) =>
  invoker.invoke(LayoutOperation.UpdateDialog, {
    subject: PROVIDER_FORM_DIALOG,
    state: true,
    blockAlign: 'start',
    props: {
      db: input.db,
      spaceId: input.spaceId,
      providerId: input.provider.id,
      providerLabel: input.provider.label ?? input.provider.id,
      existingTarget: input.existingTarget,
    },
  });

const runOnTokenCreated = (
  provider: IntegrationProviderEntry,
  input: {
    accessTokens: ReadonlyArray<AccessToken.AccessToken>;
    integration: Integration.Integration;
    existingTarget?: Ref.Ref<Obj.Any>;
  },
): Effect.Effect<void, never> => {
  if (!provider.onTokenCreated) {
    return Effect.void;
  }
  return provider.onTokenCreated(input).pipe(
    Effect.provide(FetchHttpClient.layer),
    Effect.catchAll((error) =>
      Effect.sync(() => log.warn('onTokenCreated failed', { source: input.accessTokens[0]?.source, error })),
    ),
    Effect.catchAllDefect((defect) =>
      Effect.sync(() => log.warn('onTokenCreated defect', { source: input.accessTokens[0]?.source, defect })),
    ),
  );
};

const navigateToNewIntegration = (
  invoker: Operation.OperationService,
  db: Database.Database,
  integrationId: string,
): Effect.Effect<void, never> =>
  invoker
    .invoke(LayoutOperation.Open, {
      subject: [integrationDeckSubject(Paths.getSpacePath(db.spaceId), integrationId)],
      navigation: 'immediate',
    })
    .pipe(Effect.catchAll((error) => Effect.sync(() => log.warn('navigate to new integration failed', { error }))));

const openSyncTargetsDialogAfterIntegrationCreated = (
  invoker: Operation.OperationService,
  getSyncTargets: NonNullable<IntegrationProviderEntry['getSyncTargets']>,
  persistedIntegration: Integration.Integration,
  existingTarget: Ref.Ref<Obj.Any> | undefined,
): Effect.Effect<void, never> =>
  Effect.gen(function* () {
    const { targets } = yield* invoker.invoke(getSyncTargets, {
      integration: Ref.make(persistedIntegration),
    });
    yield* invoker.invoke(LayoutOperation.UpdateDialog, {
      subject: SYNC_TARGETS_DIALOG,
      state: true,
      props: {
        integration: persistedIntegration,
        availableTargets: targets ?? [],
        existingTarget,
      },
    });
  }).pipe(
    Effect.catchAll((error) => Effect.sync(() => log.warn('open sync-targets dialog after create failed', { error }))),
  );

const finalizePendingEntry = (invoker: Operation.OperationService, entry: Pending): Effect.Effect<void, never> =>
  Effect.gen(function* () {
    const { tokens, integration, db, provider, existingTarget } = entry;
    const persistedTokens = tokens.map((token) => db.add(token));
    const persistedIntegration = db.add(integration);
    for (const persistedToken of persistedTokens) {
      Obj.setParent(persistedToken, persistedIntegration);
    }

    yield* runOnTokenCreated(provider, {
      accessTokens: persistedTokens,
      integration: persistedIntegration,
      existingTarget,
    });

    yield* Effect.all(
      [
        // Skip navigation when the flow began from a pre-existing target (e.g. a
        // Mailbox): the user is already on that surface and expects to stay there.
        existingTarget ? Effect.void : navigateToNewIntegration(invoker, db, persistedIntegration.id),
        provider.getSyncTargets
          ? openSyncTargetsDialogAfterIntegrationCreated(
              invoker,
              provider.getSyncTargets,
              persistedIntegration,
              existingTarget,
            )
          : Effect.void,
      ],
      { concurrency: 'unbounded' },
    );
  });

const initiateOAuthFlow = (
  edge: EdgeHttpClient,
  spaceId: Key.SpaceId,
  oauth: NonNullable<IntegrationProviderEntry['oauth']>,
  accessTokenId: string,
  loginHint: string | undefined,
): Effect.Effect<{ authUrl: string }, Error> =>
  Effect.tryPromise({
    try: () =>
      edge.initiateOAuthFlow(DxContext.default(), {
        provider: oauth.provider,
        scopes: [...oauth.scopes],
        spaceId,
        accessTokenId,
        ...(loginHint ? { loginHint } : {}),
      }),
    catch: (error) => (error instanceof Error ? error : new Error(String(error))),
  });

const openOAuthPopupWindow = (authUrl: string): Effect.Effect<void, never> =>
  Effect.sync(() => {
    window.open(authUrl, 'oauthPopup', 'width=500,height=600');
  });

/**
 * Open the auth URL in a new top-level browser tab. Used for
 * `useRedirectFlow` providers (e.g. atproto) where the auth server
 * nullifies `window.opener` and rejects popups.
 */
const openOAuthRedirectWindow = (authUrl: string): Effect.Effect<void, never> =>
  Effect.sync(() => {
    window.open(authUrl, '_blank');
  });

/** Snapshot of an in-flight OAuth flow persisted in `localStorage` for redirect-flow providers. */
type PendingSnapshot = {
  spaceId: Key.SpaceId;
  providerId: string;
  tokenSnapshot: { source: string; account?: string; scopes: readonly string[] };
  integrationSnapshot: { name: string; providerId: string };
  /** Serialized DXN of the existing target to attach the first new selection to. */
  existingTargetDxn?: string;
};

const writePendingSnapshot = (accessTokenId: string, snapshot: PendingSnapshot): void => {
  try {
    localStorage.setItem(pendingIntegrationStorageKey(accessTokenId), JSON.stringify(snapshot));
  } catch (error) {
    log.warn('failed to persist pending integration snapshot', { error });
  }
};

const readPendingSnapshot = (accessTokenId: string): PendingSnapshot | undefined => {
  const raw = localStorage.getItem(pendingIntegrationStorageKey(accessTokenId));
  if (!raw) {
    return undefined;
  }
  try {
    return JSON.parse(raw) as PendingSnapshot;
  } catch (error) {
    log.warn('failed to parse pending integration snapshot', { error });
    return undefined;
  }
};

const deletePendingSnapshot = (accessTokenId: string): void => {
  localStorage.removeItem(pendingIntegrationStorageKey(accessTokenId));
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* Capability.get(ClientCapabilities.Client);
    const invoker = yield* Capability.get(Capabilities.OperationInvoker);
    const pluginContext = yield* Capability.Service;

    let cachedEdgeClient: EdgeHttpClient | undefined;
    const getEdgeClient = (): EdgeHttpClient => {
      if (!cachedEdgeClient) {
        const edgeUrl = client.config.values.runtime?.services?.edge?.url;
        invariant(edgeUrl, 'EDGE services not configured.');
        const next = new EdgeHttpClient(edgeUrl);
        next.setIdentity(createEdgeIdentity(client));
        cachedEdgeClient = next;
      }
      return cachedEdgeClient;
    };

    const pending = new Map<string, Pending>();

    let edgeOrigin: string | undefined;

    const getProviderEntries = (): IntegrationProviderEntry[] => pluginContext.getAll(IntegrationProvider).flat();

    const takePendingEntry = (accessTokenId: string): Pending | undefined => {
      const entry = pending.get(accessTokenId);
      if (!entry) {
        return undefined;
      }
      pending.delete(accessTokenId);
      return entry;
    };

    const handleOAuthPostMessage = (event: MessageEvent): Effect.Effect<void, never> =>
      Effect.gen(function* () {
        if (!edgeOrigin) {
          return;
        }
        if (event.origin !== edgeOrigin) {
          return;
        }
        const decoded = decodeOAuthMessageData(event.data);
        if (decoded.tag === 'invalid') {
          return;
        }
        if (decoded.tag === 'failure') {
          log.warn('oauth flow failed', { reason: decoded.reason });
          return;
        }
        const entry = takePendingEntry(decoded.accessTokenId);
        if (!entry) {
          return;
        }
        deletePendingSnapshot(decoded.accessTokenId);
        const primaryToken = entry.tokens[0];
        if (primaryToken) {
          Obj.update(primaryToken, (token) => {
            token.token = decoded.accessToken;
          });
        }
        yield* finalizePendingEntry(invoker, entry);
      });

    const handleMessage = (event: MessageEvent): void => {
      void EffectEx.runAndForwardErrors(handleOAuthPostMessage(event));
    };

    window.addEventListener('message', handleMessage);

    const mapCoordinatorError = (error: unknown): Error => (error instanceof Error ? error : new Error(String(error)));

    const createIntegration: IntegrationCoordinator['createIntegration'] = ({
      db,
      spaceId,
      providerId,
      existingTarget,
      loginHint,
    }) =>
      Effect.gen(function* () {
        const provider = yield* resolveProvider(getProviderEntries, providerId);

        // Provider has a pre-flight form (atproto handle, IMAP creds, custom
        // token, …) — show it and let the form's submit re-enter via
        // `submitCredentialForm`. OAuth providers re-enter here with
        // `loginHint`; non-OAuth providers complete directly in the form.
        if (provider.credentialForm && loginHint === undefined) {
          yield* openProviderFormDialog(invoker, { db, spaceId, provider, existingTarget });
          return { kind: 'dialog-opened' } as const;
        }

        // Non-OAuth provider with no `credentialForm`: fall back to the
        // generic provider-form dialog (renders the default custom-token
        // schema for backwards compatibility).
        if (!provider.oauth) {
          yield* openProviderFormDialog(invoker, { db, spaceId, provider, existingTarget });
          return { kind: 'dialog-opened' } as const;
        }

        const oauth = provider.oauth;
        const label = provider.label ?? provider.id;
        // Pre-flight forms (atproto handle, …) supply a `loginHint` that
        // is meaningful as the account label too — store it so the
        // resulting Integration shows e.g. `user.bsky.social` rather than
        // just `bsky.app`.
        const account = loginHint;

        const token = Obj.make(AccessToken.AccessToken, {
          source: provider.source,
          ...(account ? { account } : {}),
          scopes: [...oauth.scopes],
          token: '',
        });
        const integration = Obj.make(Integration.Integration, {
          name: label,
          providerId: provider.id,
          accessTokens: [Ref.make(token)],
          targets: [],
        });

        pending.set(token.id, { tokens: [token], integration, db, provider, existingTarget });

        // Written for all providers: if window.opener is lost during auth, Edge
        // redirects the popup to /redirect/oauth and this snapshot is the only
        // recovery path.
        writePendingSnapshot(token.id, {
          spaceId,
          providerId: provider.id,
          tokenSnapshot: { source: provider.source, account, scopes: oauth.scopes },
          integrationSnapshot: { name: label, providerId: provider.id },
          ...(existingTarget ? { existingTargetDxn: existingTarget.uri } : {}),
        });

        const edge = getEdgeClient();
        edgeOrigin = new URL(edge.baseUrl).origin;

        const { authUrl } = yield* initiateOAuthFlow(edge, spaceId, oauth, token.id, loginHint).pipe(
          Effect.tapError(() =>
            Effect.sync(() => {
              pending.delete(token.id);
              deletePendingSnapshot(token.id);
            }),
          ),
        );

        if (oauth.useRedirectFlow) {
          yield* openOAuthRedirectWindow(authUrl);
        } else {
          yield* openOAuthPopupWindow(authUrl);
        }

        return { kind: 'oauth-started', draftIntegrationId: integration.id } as const;
      }).pipe(Effect.mapError(mapCoordinatorError));

    const finalizeRedirectFlow: IntegrationCoordinator['finalizeRedirectFlow'] = ({
      accessTokenId,
      accessToken: accessTokenValue,
    }) =>
      Effect.gen(function* () {
        // Prefer the in-memory pending entry (same-tab redirect, rare).
        const inMemory = takePendingEntry(accessTokenId);
        if (inMemory) {
          deletePendingSnapshot(accessTokenId);
          const primary = inMemory.tokens[0];
          if (primary) {
            Obj.update(primary, (primary) => {
              primary.token = accessTokenValue;
            });
          }
          yield* finalizePendingEntry(invoker, inMemory);
          return;
        }

        // Recover from the persisted snapshot (new-tab redirect, the common case).
        const snapshot = readPendingSnapshot(accessTokenId);
        if (!snapshot) {
          log.warn('finalizeRedirectFlow: no pending snapshot', { accessTokenId });
          return;
        }
        deletePendingSnapshot(accessTokenId);

        const space = client.spaces.get(snapshot.spaceId);
        if (!space) {
          return yield* Effect.fail(new SpaceUnavailableError(snapshot.spaceId));
        }
        yield* Effect.tryPromise({
          try: () => space.waitUntilReady(),
          catch: (error) => new SpaceUnavailableError(snapshot.spaceId, error),
        });

        const provider = yield* resolveProvider(getProviderEntries, snapshot.providerId);

        // Pin the AccessToken's echo id to the original `accessTokenId` so
        // Edge's tokenInfo (keyed by the id passed to /oauth/initiate) can
        // be looked up later by /atproto/proxy. Without this, the
        // snapshot-recovery path mints a fresh id that the proxy doesn't
        // know about and authenticated XRPC calls 500.
        const token = Obj.make(AccessToken.AccessToken, {
          id: accessTokenId,
          source: snapshot.tokenSnapshot.source,
          ...(snapshot.tokenSnapshot.account ? { account: snapshot.tokenSnapshot.account } : {}),
          scopes: [...snapshot.tokenSnapshot.scopes],
          token: accessTokenValue,
        });
        const integration = Obj.make(Integration.Integration, {
          name: snapshot.integrationSnapshot.name,
          providerId: snapshot.integrationSnapshot.providerId,
          accessTokens: [Ref.make(token)],
          targets: [],
        });

        const existingTarget = snapshot.existingTargetDxn
          ? space.db.makeRef<Obj.Any>(DXN.tryMake(snapshot.existingTargetDxn)!)
          : undefined;

        yield* finalizePendingEntry(invoker, { tokens: [token], integration, db: space.db, provider, existingTarget });
      }).pipe(Effect.mapError(mapCoordinatorError));

    const createCustomIntegration: IntegrationCoordinator['createCustomIntegration'] = ({
      db,
      providerId,
      source,
      account,
      token: tokenValue,
      name,
    }) =>
      Effect.gen(function* () {
        const provider = yield* resolveProvider(getProviderEntries, providerId);

        const accessToken = Obj.make(AccessToken.AccessToken, {
          source,
          account,
          token: tokenValue,
        });
        const integration = Obj.make(Integration.Integration, {
          name: name ?? account ?? source,
          providerId: provider.id,
          accessTokens: [Ref.make(accessToken)],
          targets: [],
        });

        yield* finalizePendingEntry(invoker, {
          tokens: [accessToken],
          integration,
          db,
          provider,
        });

        return { kind: 'integration-created', integrationId: integration.id } as const;
      }).pipe(Effect.mapError(mapCoordinatorError));

    const submitCredentialForm: IntegrationCoordinator['submitCredentialForm'] = ({
      db,
      spaceId,
      providerId,
      values,
      existingTarget,
    }) =>
      Effect.gen(function* () {
        const provider = yield* resolveProvider(getProviderEntries, providerId);
        if (!provider.credentialForm) {
          return yield* Effect.fail(new Error(`Provider ${providerId} has no credentialForm.`));
        }

        const result = yield* provider.credentialForm.onSubmit({ values, provider, db, existingTarget });

        if (result.kind === 'complete') {
          yield* finalizePendingEntry(invoker, {
            tokens: result.accessTokens,
            integration: result.integration,
            db,
            provider,
            existingTarget,
          });
          return { kind: 'integration-created', integrationId: result.integration.id } as const;
        }

        // OAuth pre-flight: re-enter createIntegration with the captured loginHint.
        // Guard against an empty hint — otherwise createIntegration would re-open
        // the credential-form dialog and we'd loop.
        const loginHint = result.loginHint?.trim();
        if (!loginHint) {
          return yield* Effect.fail(new Error(`Provider ${providerId} credentialForm produced an empty loginHint.`));
        }
        return yield* createIntegration({ db, spaceId, providerId, loginHint, existingTarget });
      }).pipe(Effect.mapError(mapCoordinatorError));

    return Capability.contributes(
      IntegrationCoordinator,
      { createIntegration, createCustomIntegration, finalizeRedirectFlow, submitCredentialForm },
      () =>
        Effect.sync(() => {
          window.removeEventListener('message', handleMessage);
          pending.clear();
        }),
    );
  }),
);

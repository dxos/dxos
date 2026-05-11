//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capability } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import {
  IntegrationProvider as IntegrationProviderCapability,
  type OnTokenCreated,
} from '@dxos/plugin-integration';
import { OAuthProvider } from '@dxos/protocols';

import { LINEAR_PROVIDER_ID, LINEAR_SOURCE } from '../constants';
import { LinearApi } from '../services';
import { LinearOperation } from '../types';

/**
 * Service-specific token-created hook for Linear.
 *
 * Calls Linear's `viewer` GraphQL query to populate `accessToken.account`
 * with the authenticated user's email (falling back to display name).
 * Failures are elevated with {@link Effect.orDie}; plugin-integration logs
 * defects from the runner and continues so a failed lookup cannot block the
 * Integration already created.
 */
const onTokenCreated: OnTokenCreated = ({ accessToken }) =>
  Effect.gen(function* () {
    if (accessToken.account) {
      return;
    }
    const viewer = yield* LinearApi.fetchViewer().pipe(
      Effect.provide(Layer.succeed(LinearApi.LinearCredentials, { token: accessToken.token })),
    );
    Obj.update(accessToken, (accessToken) => {
      accessToken.account = viewer.email ?? viewer.name;
    });
  }).pipe(Effect.orDie);

/**
 * Contributes a single `IntegrationProvider` entry that wires Linear's two
 * operations and the token-created hook to the `'linear.app'` source.
 *
 * Sync targets are Linear teams. Per-target `SyncOptions.maxDaysBack` caps
 * how far back issues are pulled by `Issue.updatedAt`.
 *
 * Scope `read` is sufficient for v1 (pull-only). `write`/`issues:create`
 * would be needed if/when bidirectional Task sync is added.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(IntegrationProviderCapability, [
      {
        id: LINEAR_PROVIDER_ID,
        source: LINEAR_SOURCE,
        label: 'Linear',
        oauth: {
          provider: OAuthProvider.LINEAR,
          scopes: ['read'],
        },
        getSyncTargets: LinearOperation.GetLinearTeams,
        sync: LinearOperation.SyncLinearTeams,
        optionsSchema: LinearOperation.SyncOptions,
        onTokenCreated,
      },
    ]);
  }),
);

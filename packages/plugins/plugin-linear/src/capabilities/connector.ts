//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capability } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { Connector, type OnTokenCreated } from '@dxos/plugin-connector';
import { OAuthProvider } from '@dxos/protocols';

import { LINEAR_PROVIDER_ID, LINEAR_SOURCE } from '../constants';
import { LinearApi } from '../services';
import { LinearOperation } from '../types';

/**
 * Service-specific token-created hook for Linear.
 *
 * Calls Linear's `viewer` GraphQL query to populate `accessToken.account`
 * with the authenticated user's email (falling back to display name).
 * Failures are elevated with {@link Effect.orDie}; plugin-connector logs
 * defects from the runner and continues so a failed lookup cannot block the
 * Connection already created.
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
 * Contributes a single `Connector` entry that wires Linear's discovery,
 * materialization, and sync operations plus the token-created hook to the
 * `'linear.app'` source.
 *
 * Sync targets are Linear teams; each is bound by one external-sync `Cursor` whose
 * `spec.target` is the team's local root Project. Per-binding `SyncOptions.maxDaysBack`
 * caps how far back issues are pulled by `Issue.updatedAt`.
 *
 * Scopes:
 *   - `read`  — required for pull (projects, issues, workflow states).
 *   - `write` — required to push local edits back via `issueUpdate` and
 *               `projectUpdate`. Linear treats issue and project mutations
 *               under a single umbrella `write` scope; there's no narrower
 *               permission for "edit only, never create".
 *
 * Note: existing tokens issued with `read` only will return permission errors
 * on push. Re-consent via the connection setup flow upgrades the scope.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Connector, [
      {
        id: LINEAR_PROVIDER_ID,
        source: LINEAR_SOURCE,
        label: 'Linear',
        oauth: {
          provider: OAuthProvider.LINEAR,
          scopes: ['read', 'write'],
        },
        getSyncTargets: LinearOperation.GetLinearTeams,
        materializeTarget: LinearOperation.MaterializeLinearTarget,
        sync: LinearOperation.SyncLinearTeams,
        optionsSchema: LinearOperation.SyncOptions,
        onTokenCreated,
      },
    ]);
  }),
);

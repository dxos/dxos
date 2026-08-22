//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { Filter, Obj, Ref } from '@dxos/echo';
import { AccessToken, Connection } from '@dxos/link';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { ConnectorEvents, ConnectorSpec } from '#types';

/**
 * `import.meta.env` keys the dev server publishes connector keys under, and the companion list of
 * the names it published. Prefixed rather than bare so the vite `define` map cannot collide with
 * an unrelated variable, and so the exposed set is greppable.
 *
 * `define` substitutes textually, so `import.meta.env` cannot be enumerated for these — hence the
 * explicit `DX_SECRET_NAMES` list.
 */
const secretNames = (): string[] => {
  const raw = (import.meta as any).env?.DX_SECRET_NAMES;
  return typeof raw === 'string' && raw.length > 0 ? raw.split(',') : [];
};

const readSecret = (envBinding: string): string | undefined => {
  const value = (import.meta as any).env?.[`DX_SECRET_${envBinding}`];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

/**
 * Provisions connections from the local environment, so a key lives in `.env` rather than being
 * re-pasted into the connector dialog after every profile reset.
 *
 * For each connector declaring an {@link ConnectorSpec.ConnectorEntry.envBinding} whose key the
 * dev server exposes, writes the `AccessToken` + `Connection` pair the dialog would have written,
 * into the default space. Idempotent on `AccessToken.source`: a no-op once a connection exists,
 * however it was created.
 *
 * Activates on `SpacesReady` — provisioning has to happen at boot, and `ConnectorEvents.Start` is
 * demand-driven (it does not arrive on its own within a couple of minutes of an idle tab). The
 * connector entries only exist once that event *has* fired, though, and `requires` waits for
 * whatever is registered rather than forcing a lazy contributor — so this activates it explicitly.
 * That happens only after the early return below, so a build with no exposed secrets (every
 * production build: `define` supplies nothing there) leaves connector laziness exactly as it was.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const names = secretNames();
    if (names.length === 0) {
      return [];
    }

    const client = yield* ClientCapabilities.Client;
    const space = AppSpace.getDefaultSpace(client);
    if (!space) {
      log('env credentials: no default space, skipping');
      return [];
    }

    // Pull the connector entries into existence; see the note above on why this is safe.
    const manager = yield* Plugin.Service;
    yield* manager.activate(ConnectorEvents.Start).pipe(Effect.ignore);

    const bound = (yield* Capability.getAll(ConnectorSpec.Connector)).flat().filter((entry) => entry.envBinding);
    if (bound.length === 0) {
      log('env credentials: no connector declares an envBinding', { exposed: names.length });
      return [];
    }

    yield* Effect.promise(() => space.waitUntilReady());
    // One query for the whole pass. `run()` resolves to an array, not `{ objects }`.
    const existing = new Set(
      [...(yield* Effect.promise(() => space.db.query(Filter.type(AccessToken.AccessToken)).run()))].map(
        (token: AccessToken.AccessToken) => token.source,
      ),
    );

    const provisioned: string[] = [];
    for (const connector of bound) {
      if (existing.has(connector.source)) {
        continue;
      }
      const token = readSecret(connector.envBinding!);
      if (!token) {
        continue;
      }
      const accessToken = space.db.add(Obj.make(AccessToken.AccessToken, { source: connector.source, token }));
      space.db.add(
        Obj.make(Connection.Connection, {
          name: connector.label ?? connector.id,
          connectorId: connector.id,
          accessToken: Ref.make(accessToken),
        }),
      );
      provisioned.push(connector.source);
    }

    if (provisioned.length > 0) {
      yield* Effect.promise(() => space.db.flush());
      // Sources only — the values are credentials.
      log.info('env credentials: provisioned connections', { sources: provisioned });
    }

    return [];
  }),
);

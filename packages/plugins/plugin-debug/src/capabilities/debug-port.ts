//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { log } from '@dxos/log';
import { getDebugPortController } from '@dxos/react-client/devtools';

export type DebugPortProps = {
  /** Empty in every build that was not launched with the flag, which is the common case — see below. */
  session: string;
};

/**
 * Starts the agent debug port on the session the dev server was launched with.
 *
 * The port is arbitrary eval, so this module exists only because the flag that supplies `session` is
 * itself a deliberate act by whoever started the server — and one that cannot happen on a deployed
 * origin, since the flag is compiled out of production builds. `persist` carries the session across
 * the HMR reloads a dev session is made of; the settings switch still stops it.
 *
 * The module is registered unconditionally (options are not readable when the plugin is piped
 * together) and does nothing without a session, so the absent flag is the inert path rather than a
 * branch someone has to remember to write.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* ({ session }: DebugPortProps) {
    if (!session) {
      return [];
    }

    const controller = getDebugPortController();
    controller.start({ session, persist: true });
    log.info('Debug port started by the dev server flag.', { session });
    yield* Effect.addFinalizer(() => Effect.sync(() => controller.stop()));
    return [];
  }),
);

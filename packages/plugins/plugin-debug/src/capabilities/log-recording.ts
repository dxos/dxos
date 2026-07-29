//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { logBuffer } from '@dxos/react-ui-debug';

/**
 * Start recording into the process-wide log buffer at startup, so the log companion shows what
 * happened before it was opened. Recording deliberately does not follow the panel's mount: the
 * entries worth reading are usually the ones from before you went looking.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    logBuffer.start();
    return Capability.contributes(Capabilities.Null, null, () => Effect.sync(() => logBuffer.stop()));
  }),
);

//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { DXN } from '@dxos/keys';

/** Key the spec invokes; it reaches the handler only once Composer has loaded this module's body. */
export const ECHO_KEY = 'org.dxos.operation.e2eRemotePlugin.getEcho';

const Echo = Operation.make({
  meta: { key: DXN.make(ECHO_KEY), name: 'Echo', description: 'Returns its input, marked as answered by the plugin.' },
  input: Schema.Struct({ text: Schema.String }),
  output: Schema.Struct({ text: Schema.String, from: Schema.String }),
});

const EchoHandler = Echo.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ text }) {
      return { text, from: 'e2e-remote-plugin' };
    }),
  ),
);

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(Capabilities.OperationHandler, OperationHandlerSet.make(EchoHandler))),
);

//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as Operation from '@dxos/compute/Operation';
import { Obj, Ref } from '@dxos/echo';

import { Sandbox, SandboxOperation } from '#types';

/** Contributes "Grant account access" to every sandbox, the one place a sandbox is handed the reader's credential. */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* AppGraphBuilder.createExtension({
      id: SandboxOperation.GrantAccountAccess.meta.key,
      match: (node, get) => AppNodeMatcher.whenEchoType(Sandbox.Sandbox)(node, get),
      actions: (sandbox) =>
        Effect.succeed([
          AppGraphNode.makeAction({
            id: `${sandbox.id}.grant-account-access`,
            // The handler writes the token into the sandbox's space, which only its space context supplies.
            data: () =>
              Operation.invoke(
                SandboxOperation.GrantAccountAccess,
                { sandbox: Ref.make(sandbox) },
                { spaceId: Obj.getDatabase(sandbox)?.spaceId },
              ).pipe(Effect.asVoid),
            properties: {
              label: 'Grant account access',
              icon: 'ph--key--regular',
              disposition: 'list-item',
            },
          }),
        ]),
    });

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);

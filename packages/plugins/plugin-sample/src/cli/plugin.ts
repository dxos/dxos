//
// Copyright 2025 DXOS.org
//

// CLI plugin variant — a minimal plugin for headless/CLI environments.
// CLI plugins register only the capabilities needed for non-UI contexts:
// schema (so the CLI can query/create objects) and metadata (for the createObject factory).
// No surfaces, graph builders, settings, or translations are needed.

import * as Effect from 'effect/Effect';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { type CreateObject } from '@dxos/plugin-space/types';

import { OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { SampleItem } from '#types';

export const SamplePlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: {
      id: SampleItem.SampleItem.typename,
      metadata: {
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = SampleItem.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          })) satisfies CreateObject,
      },
    },
  }),
  AppPlugin.addSchemaModule({ schema: [SampleItem.SampleItem] }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  Plugin.make,
);

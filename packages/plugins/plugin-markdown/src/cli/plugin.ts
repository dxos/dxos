//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';
import { type CreateObject } from '@dxos/plugin-space/types';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { Text } from '@dxos/schema';

// NOTE: Must not import from index to avoid pulling in react dependencies.
import { OperationHandler } from '../capabilities/operation-handler';
import { meta } from '../meta';
import { Markdown } from '../types';

export const MarkdownPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: {
      id: Markdown.Document.typename,
      metadata: {
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = Markdown.make(props);
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
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Markdown.Document, Text.Text] }),
  Plugin.make,
);

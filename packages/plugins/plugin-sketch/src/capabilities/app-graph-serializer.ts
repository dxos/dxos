//
// Copyright 2025 DXOS.org
//

import { pipe } from 'effect';

import { Capabilities, chain, contributes, createIntent, type PluginsContext } from '@dxos/app-framework';
import { CollectionType, SpaceAction } from '@dxos/plugin-space/types';
import { isSpace } from '@dxos/react-client/echo';

import { SKETCH_PLUGIN } from '../meta';
import translations from '../translations';
import { SketchAction, DiagramType } from '../types';

export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphSerializer, [
    {
      inputType: DiagramType.typename,
      outputType: 'application/tldraw',
      // Reconcile with metadata serializers.
      serialize: async (node) => {
        const diagram = node.data;
        const canvas = await diagram.canvas.load();
        return {
          name: diagram.name || translations[0]['en-US'][SKETCH_PLUGIN]['object placeholder'],
          data: JSON.stringify({ schema: canvas.schema, content: canvas.content }),
          type: 'application/tldraw',
        };
      },
      deserialize: async (data, ancestors) => {
        const space = ancestors.find(isSpace);
        const target =
          ancestors.findLast((ancestor) => ancestor instanceof CollectionType) ??
          space?.properties[CollectionType.typename]?.target;
        if (!space || !target) {
          return;
        }

        const { schema, content } = JSON.parse(data.data);

        const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
        const result = await dispatch(
          pipe(
            createIntent(SketchAction.Create, { name: data.name, schema, content }),
            chain(SpaceAction.AddObject, { target }),
          ),
        );

        return result.data?.object;
      },
    },
  ]);

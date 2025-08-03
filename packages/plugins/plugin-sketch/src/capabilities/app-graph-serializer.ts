//
// Copyright 2025 DXOS.org
//

import { pipe } from 'effect';

import { Capabilities, type PluginContext, chain, contributes, createIntent } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { SpaceAction } from '@dxos/plugin-space/types';
import { isSpace } from '@dxos/react-client/echo';
import { DataType } from '@dxos/schema';

import { translations } from '../translations';
import { DiagramType, SketchAction } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.AppGraphSerializer, [
    {
      inputType: DiagramType.typename,
      outputType: 'application/tldraw',
      // Reconcile with metadata serializers.
      serialize: async (node) => {
        const diagram = node.data;
        const canvas = await diagram.canvas.load();
        return {
          name: diagram.name || translations[0]['en-US'][DiagramType.typename]['object name placeholder'],
          data: JSON.stringify({ schema: canvas.Schema, content: canvas.content }),
          type: 'application/tldraw',
        };
      },
      deserialize: async (data, ancestors) => {
        const space = ancestors.find(isSpace);
        const target =
          ancestors.findLast((ancestor) => Obj.instanceOf(DataType.Collection, ancestor)) ??
          space?.properties[DataType.Collection.typename]?.target;
        if (!space || !target) {
          return;
        }

        const { schema, content } = JSON.parse(data.data);

        const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
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

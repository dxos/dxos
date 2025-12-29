//
// Copyright 2025 DXOS.org
//

import * as Function from 'effect/Function';

import { Capability, Common, chain, createIntent } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { SpaceAction } from '@dxos/plugin-space/types';
import { isSpace } from '@dxos/react-client/echo';
import { Collection } from '@dxos/schema';

import { translations } from '../../translations';
import { Diagram, SketchAction } from '../../types';

export default Capability.makeModule((context) =>
  Capability.contributes(Common.Capability.AppGraphSerializer, [
    {
      inputType: Diagram.Diagram.typename,
      outputType: 'application/tldraw',
      // Reconcile with metadata serializers.
      serialize: async (node) => {
        const diagram = node.data;
        const canvas = await diagram.canvas.load();
        return {
          name: diagram.name || translations[0]['en-US'][Diagram.Diagram.typename]['object name placeholder'],
          data: JSON.stringify({ schema: canvas.Schema, content: canvas.content }),
          type: 'application/tldraw',
        };
      },
      deserialize: async (data, ancestors) => {
        const space = ancestors.find(isSpace);
        const target =
          ancestors.findLast((ancestor) => Obj.instanceOf(Collection.Collection, ancestor)) ??
          space?.properties[Collection.Collection.typename]?.target;
        if (!space || !target) {
          return;
        }

        const { schema, content } = JSON.parse(data.data);

        const { dispatchPromise: dispatch } = context.getCapability(Common.Capability.IntentDispatcher);
        const result = await dispatch(
          Function.pipe(
            createIntent(SketchAction.Create, { name: data.name, schema, content }),
            chain(SpaceAction.AddObject, { target }),
          ),
        );

        return result.data?.object;
      },
    },
  ]),
);

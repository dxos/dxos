//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { Option, pipe } from 'effect';

import { Capabilities, contributes, type PluginContext } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { ATTENDABLE_PATH_SEPARATOR, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { createExtension } from '@dxos/plugin-graph';
import { TableView } from '@dxos/react-ui-table/types';
import { DataType } from '@dxos/schema';

import { meta } from '../meta';

export default (context: PluginContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    // TODO(burdon): Factor out to space plugin.
    createExtension({
      id: `${meta.id}/schema`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (Obj.instanceOf(TableView, node.data) ? Option.some(node) : Option.none())),
            Option.map((node) => [
              {
                id: [node.id, 'schema'].join(ATTENDABLE_PATH_SEPARATOR),
                type: PLANK_COMPANION_TYPE,
                data: 'schema',
                properties: {
                  label: ['companion schema label', { ns: meta.id }],
                  icon: 'ph--database--regular',
                  disposition: 'hidden',
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),
    // TODO(wittjosiah): Factor out to space plugin.
    createExtension({
      id: `${meta.id}/selected-objects`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (Obj.instanceOf(DataType.View, node.data) ? Option.some(node) : Option.none())),
            Option.map((node) => [
              {
                id: [node.id, 'selected-objects'].join(ATTENDABLE_PATH_SEPARATOR),
                type: PLANK_COMPANION_TYPE,
                data: 'selected-objects',
                properties: {
                  label: ['companion selected objects label', { ns: meta.id }],
                  icon: 'ph--tree-view--regular',
                  disposition: 'hidden',
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ]);

//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { Option, pipe } from 'effect';

import { Capabilities, contributes, type PluginContext } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { PLANK_COMPANION_TYPE, ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { createExtension } from '@dxos/plugin-graph';
import { isEchoObject } from '@dxos/react-client/echo';
import { TableType } from '@dxos/react-ui-table';
import { ViewType } from '@dxos/schema';

import { meta } from '../meta';

export default (context: PluginContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    // TODO(burdon): Factor out/make generic?
    createExtension({
      id: `${meta.id}/schema`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (isInstanceOf(TableType, node.data) ? Option.some(node) : Option.none())),
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
    // TODO(wittjosiah): Factor out/make generic?
    createExtension({
      id: `${meta.id}/selected-objects`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => {
              if (!node.data || !isEchoObject(node.data)) {
                return Option.none();
              }

              const subject = node.data;
              // TODO(ZaymonFC): Unify the path of view between table and kanban.
              const hasValidView = subject.view?.target instanceof ViewType;
              const hasValidCardView = subject.cardView?.target instanceof ViewType;

              return hasValidView || hasValidCardView ? Option.some(node) : Option.none();
            }),
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

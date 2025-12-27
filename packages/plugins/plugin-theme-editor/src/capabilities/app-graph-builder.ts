//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import { Capabilities, type PluginContext, contributes, defineCapabilityModule } from '@dxos/app-framework';
import { Graph, GraphBuilder } from '@dxos/plugin-graph';

import { themeEditorId } from '../defs';
import { meta } from '../meta';

export default defineCapabilityModule((context: PluginContext) => {
  return contributes(Capabilities.AppGraphBuilder, [
    // Debug node.
    GraphBuilder.createExtension({
      id: themeEditorId,
      connector: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (node.id === Graph.ROOT_ID ? Option.some(node) : Option.none())),
            Option.map(() => {
              return [
                {
                  id: themeEditorId,
                  type: themeEditorId,
                  data: themeEditorId,
                  properties: {
                    label: ['theme editor label', { ns: meta.id }],
                    disposition: 'navigation',
                    icon: 'ph--palette--regular',
                  },
                },
              ];
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ]);
});

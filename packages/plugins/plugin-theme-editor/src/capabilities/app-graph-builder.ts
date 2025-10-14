//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import * as Option from 'effect/Option';
import * as pipe from 'effect/pipe';

import { Capabilities, type PluginContext, contributes } from '@dxos/app-framework';
import { ROOT_ID, createExtension } from '@dxos/plugin-graph';

import { themeEditorId } from '../defs';
import { meta } from '../meta';

export default (context: PluginContext) => {
  return contributes(Capabilities.AppGraphBuilder, [
    // Debug node.
    createExtension({
      id: themeEditorId,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (node.id === ROOT_ID ? Option.some(node) : Option.none())),
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
};

//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import { Capabilities, type PluginContext, contributes } from '@dxos/app-framework';
import { ROOT_ID, createExtension } from '@dxos/plugin-graph';

import { themeEditorId } from '../defs';
import { meta } from '../meta';

export default (context: PluginContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    // Debug node.
    createExtension({
      id: themeEditorId,
      connector: (node) =>
        Rx.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (node.id === ROOT_ID ? Option.some(node) : Option.none())),
            Option.map(() => [
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
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ]);

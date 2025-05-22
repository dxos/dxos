//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { Option, pipe } from 'effect';

import { Capabilities, contributes, type PluginContext } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { ScriptType } from '@dxos/functions';
import { PLANK_COMPANION_TYPE, ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { createExtension } from '@dxos/plugin-graph';
import { SPACE_PLUGIN } from '@dxos/plugin-space';

import { meta } from '../meta';

export default (context: PluginContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${meta.id}/space-settings-automation`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (node.type === `${SPACE_PLUGIN}/settings` ? Option.some(node) : Option.none())),
            Option.map((node) => [
              {
                id: `automation-${node.id}`,
                type: `${meta.id}/space-settings-automation`,
                data: `${meta.id}/space-settings-automation`,
                properties: {
                  label: ['automation panel label', { ns: meta.id }],
                  icon: 'ph--lightning--regular',
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),
    createExtension({
      id: `${meta.id}/space-settings-functions`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (node.type === `${SPACE_PLUGIN}/settings` ? Option.some(node) : Option.none())),
            Option.map((node) => [
              {
                id: `functions-${node.id}`,
                type: `${meta.id}/space-settings-functions`,
                data: `${meta.id}/space-settings-functions`,
                properties: {
                  label: ['functions panel label', { ns: meta.id }],
                  icon: 'ph--function--regular',
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),
    createExtension({
      id: `${meta.id}/script-companion`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (isInstanceOf(ScriptType, node.data) ? Option.some(node) : Option.none())),
            Option.map((node) => [
              {
                id: [node.id, 'automation'].join(ATTENDABLE_PATH_SEPARATOR),
                type: PLANK_COMPANION_TYPE,
                data: 'automation',
                properties: {
                  label: ['script automation label', { ns: meta.id }],
                  icon: 'ph--lightning--regular',
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ]);

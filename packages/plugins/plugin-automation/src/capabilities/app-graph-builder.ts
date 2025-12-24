//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import { Capabilities, type PluginContext, contributes, defineCapabilityModule } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { Script } from '@dxos/functions';
import { ATTENDABLE_PATH_SEPARATOR, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { createExtension } from '@dxos/plugin-graph';
import { meta as spaceMeta } from '@dxos/plugin-space';

import { meta } from '../meta';

export default defineCapabilityModule((context: PluginContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${meta.id}/space-settings-automation`,
      connector: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (node.type === `${spaceMeta.id}/settings` ? Option.some(node) : Option.none())),
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
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (node.type === `${spaceMeta.id}/settings` ? Option.some(node) : Option.none())),
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
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (Obj.instanceOf(Script.Script, node.data) ? Option.some(node) : Option.none())),
            Option.map((node) => [
              {
                id: [node.id, 'automation'].join(ATTENDABLE_PATH_SEPARATOR),
                type: PLANK_COMPANION_TYPE,
                data: 'automation',
                properties: {
                  label: ['script automation label', { ns: meta.id }],
                  icon: 'ph--lightning--regular',
                  disposition: 'hidden',
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ]),
);

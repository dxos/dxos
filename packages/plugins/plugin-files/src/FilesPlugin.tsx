//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvent, Capability, Common, Plugin } from '@dxos/app-framework';
import { AttentionEvents } from '@dxos/plugin-attention';
import { Node } from '@dxos/plugin-graph';

import { AppGraphBuilder, FileSettings, FileState, Markdown, OperationResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { FileCapabilities } from './types';

// TODO(burdon): Rename package plugin-file (singular).

const SettingsReady = Common.ActivationEvent.createSettingsEvent(FileCapabilities.Settings.identifier);

export const FilesPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addSettingsModule({ activate: FileSettings, activatesAfter: [SettingsReady] }),
  Plugin.addModule({
    id: 'state',
    activatesOn: ActivationEvent.allOf(
      Common.ActivationEvent.OperationInvokerReady,
      SettingsReady,
      AttentionEvents.AttentionReady,
    ),
    activate: FileState,
  }),
  Common.Plugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'markdown',
    activatesOn: SettingsReady,
    activate: Markdown,
  }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addOperationResolverModule({ activate: OperationResolver }),
  Common.Plugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Plugin.addModule({
    id: 'app-graph-serializer',
    activatesOn: Common.ActivationEvent.AppGraphReady,
    activate: () =>
      Effect.succeed(
        Capability.contributes(Common.Capability.AppGraphSerializer, [
          {
            inputType: Node.RootType,
            outputType: 'text/directory',
            position: 'fallback',
            serialize: async () => ({
              name: 'root',
              data: 'root',
              type: 'text/directory',
            }),
            deserialize: async () => {
              // No-op.
            },
          },
        ]),
      ),
  }),
  Plugin.make,
);

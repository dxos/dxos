//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';

import {
  AppGraphBuilder,
  CreateObject,
  HelpState,
  OperationHandler,
  ReactRoot,
  ReactSurface,
  SkillDefinition,
  SupportSettings,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { type Tour, Support, SupportOperation } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export type SupportPluginOptions = { helpSteps?: Tour.Step[] };

export const SupportPlugin = Plugin.define<SupportPluginOptions>(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addSkillDefinitionModule({ activate: SkillDefinition }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Support.Ticket] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    activatesOn: ActivationEvents.Startup,
    activate: HelpState,
  }),
  Plugin.addModule(({ helpSteps = [] }) => ({
    id: 'react-root',
    activatesOn: ActivationEvents.Startup,
    activate: () => ReactRoot(helpSteps),
  })),
  Plugin.addModule({
    id: 'on-space-created',
    activatesOn: SpaceEvents.SpaceCreated,
    activate: () =>
      Effect.succeed(
        Capability.contributes(SpaceCapabilities.OnCreateSpace, (params) =>
          Operation.invoke(SupportOperation.OnCreateSpace, params),
        ),
      ),
  }),
  Plugin.addModule({
    id: 'settings',
    activatesOn: AppActivationEvents.SetupSettings,
    activate: SupportSettings,
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default SupportPlugin;

//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { ClientEvents } from '@dxos/plugin-client';

import {
  AppGraphBuilder,
  BlueprintDefinition,
  CreateObject,
  HelpState,
  OperationHandler,
  ReactRoot,
  ReactSurface,
  SupportSettings,
  WelcomeProvisioner,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Support, type Step } from '#types';

export type SupportPluginOptions = { helpSteps?: Step[] };

export const SupportPlugin = Plugin.define<SupportPluginOptions>(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Support.Ticket, Support.Welcome] }),
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
    id: 'welcome-provisioner',
    activatesOn: ClientEvents.SpacesReady,
    activate: WelcomeProvisioner,
  }),
  Plugin.addModule({
    id: 'settings',
    activatesOn: AppActivationEvents.SetupSettings,
    activate: SupportSettings,
  }),
  Plugin.make,
);

export default SupportPlugin;

//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import {
  AppGraphBuilder,
  BlueprintDefinition,
  CreateObject,
  HelpState,
  OperationHandler,
  ReactRoot,
  ReactSurface,
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
  Plugin.make,
);

export default SupportPlugin;

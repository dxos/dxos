//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import {
  AppGraphBuilder,
  BlueprintDefinition,
  DiagnosticProviders,
  OperationHandler,
  ReactSurface,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const DoctorPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  Plugin.addModule({
    id: `${meta.id}/diagnostic-providers`,
    activatesOn: ActivationEvents.Startup,
    activate: DiagnosticProviders,
  }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default DoctorPlugin;

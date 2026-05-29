//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvent, ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { ClientEvents } from '@dxos/plugin-client';
import { SpaceEvents } from '@dxos/plugin-space';

import {
  AppGraphBuilder,
  DefaultContent,
  Onboarding,
  ReactSurface,
  WelcomeCapabilities,
  type WelcomeOptions,
} from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const WelcomePlugin = Plugin.define<WelcomeOptions>(meta).pipe(
  Plugin.addModule((options) => ({
    id: 'options',
    activatesOn: ActivationEvents.Startup,
    activate: Capability.makeModule(
      Effect.fnUntraced(function* () {
        return Capability.contributes(WelcomeCapabilities.Options, options);
      }),
    ),
  })),
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'default-content',
    activatesOn: SpaceEvents.PersonalSpaceReady,
    activate: DefaultContent,
  }),
  Plugin.addModule({
    id: 'onboarding',
    activatesOn: ActivationEvent.allOf(
      AppActivationEvents.AppGraphReady,
      ActivationEvents.ProcessManagerReady,
      AppActivationEvents.LayoutReady,
      ClientEvents.ClientReady,
    ),
    activate: Onboarding,
  }),
  Plugin.make,
);

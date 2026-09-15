//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { AboutDialog, AuthorizingDeviceDialog, NativeRedirectDialog } from '../components/index.ts';
import { ABOUT_DIALOG, AUTHORIZING_DEVICE_DIALOG, NATIVE_REDIRECT_DIALOG, WELCOME_SCREEN } from '../constants.ts';
import { SampleSettings, WelcomeContainer } from '../containers/index.ts';
import { meta } from '../meta.ts';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'pluginSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
        component: SampleSettings,
      }),
      Surface.create({
        id: 'welcome',
        filter: AppSurface.component(AppSurface.Dialog, WELCOME_SCREEN),
        component: WelcomeContainer,
      }),
      Surface.create({
        id: 'authorizingDevice',
        filter: AppSurface.component(AppSurface.Dialog, AUTHORIZING_DEVICE_DIALOG),
        component: AuthorizingDeviceDialog,
      }),
      Surface.create({
        id: 'nativeRedirect',
        filter: AppSurface.component<{ onOpenHere: () => void }>(AppSurface.Dialog, NATIVE_REDIRECT_DIALOG),
        component: NativeRedirectDialog,
        props: ({ data: { props } }) => ({ ...props }),
      }),
      Surface.create({
        id: 'aboutDialog',
        filter: AppSurface.component(AppSurface.Dialog, ABOUT_DIALOG),
        component: AboutDialog,
      }),
    ]),
  ),
);

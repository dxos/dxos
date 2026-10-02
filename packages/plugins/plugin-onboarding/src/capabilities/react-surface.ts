//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';

import { AboutDialog, AuthorizingDeviceDialog, NativeRedirectDialog } from '../components/index.ts';
import { ABOUT_DIALOG, AUTHORIZING_DEVICE_DIALOG, NATIVE_REDIRECT_DIALOG, WELCOME_SCREEN } from '../constants.ts';
import { WelcomeContainer } from '../containers/index.ts';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.Root.create({
        id: 'welcome',
        filter: AppSurface.component(AppSurface.Dialog, WELCOME_SCREEN),
        component: WelcomeContainer,
      }),
      Surface.Root.create({
        id: 'authorizingDevice',
        filter: AppSurface.component(AppSurface.Dialog, AUTHORIZING_DEVICE_DIALOG),
        component: AuthorizingDeviceDialog,
      }),
      Surface.Root.create({
        id: 'nativeRedirect',
        filter: AppSurface.component<{ onOpenHere: () => void }>(AppSurface.Dialog, NATIVE_REDIRECT_DIALOG),
        component: NativeRedirectDialog,
        props: ({ data: { props } }) => ({ ...props }),
      }),
      Surface.Root.create({
        id: 'aboutDialog',
        filter: AppSurface.component(AppSurface.Dialog, ABOUT_DIALOG),
        component: AboutDialog,
      }),
    ]),
  ),
);

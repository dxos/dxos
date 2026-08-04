//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { ABOUT_DIALOG, AboutDialog, NATIVE_REDIRECT_DIALOG, NativeRedirectDialog, WELCOME_SCREEN } from '../components';
import { ExemplarSettings } from '../containers';
import { meta } from '../meta';
import { WelcomeSurface } from './WelcomeSurface';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'pluginSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
        component: ExemplarSettings,
      }),
      Surface.create({
        id: 'welcome',
        filter: AppSurface.component(AppSurface.Dialog, WELCOME_SCREEN),
        component: WelcomeSurface,
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

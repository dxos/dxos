//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

// Module paths, not the barrel: the barrel re-exports the welcome screen, which would put the
// onboarding-only UI in every tab's resident set alongside the always-available About dialog.
import { AboutDialog } from '../components/AboutDialog';
import { ABOUT_DIALOG, NATIVE_REDIRECT_DIALOG, WELCOME_SCREEN } from '../components/keys';
import { NativeRedirectDialog } from '../components/NativeRedirectDialog';
import { ExemplarSettings } from '../containers';
import { meta } from '../meta';
import { WelcomeSurface } from './WelcomeSurface';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
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

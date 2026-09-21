//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { translations } from '../translations.ts';

export { OnboardingAppGraphBuilder as AppGraphBuilder } from './app-graph-builder.ts';
export { DefaultContent } from './default-content.ts';
export { MigrateDemoSpace } from './migrate-demo-space.ts';
export { OAuthRecoveryRedirect } from './oauth-recovery-redirect.ts';
export { Onboarding } from './onboarding.ts';
export { OperationHandler } from './operation-handler.ts';
export { ReactSurface } from './react-surface.ts';
export const SpaceTemplates = AppCapability.lazySpaceTemplates(() => import('./space-templates.ts'));

export * from './capabilities.ts';
export const Translations = AppCapability.translations(translations);

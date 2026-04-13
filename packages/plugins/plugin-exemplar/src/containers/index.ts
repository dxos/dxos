//
// Copyright 2025 DXOS.org
//

// Container barrel with lazy exports.
// React.lazy enables code-splitting so container modules (and their dependencies)
// are only loaded when the surface is actually rendered. Each container file
// must have a `export default` for `lazy()` to work.

import { type ComponentType, lazy } from 'react';

export const ExemplarArticle: ComponentType<any> = lazy(() => import('./ExemplarArticle'));
export const ExemplarSettings: ComponentType<any> = lazy(() => import('./ExemplarSettings'));
export const ExemplarObjectSettings: ComponentType<any> = lazy(() => import('./ExemplarObjectSettings'));
export const ExemplarCompanionPanel: ComponentType<any> = lazy(() => import('./ExemplarCompanionPanel'));
export const ExemplarDeckCompanion: ComponentType<any> = lazy(() => import('./ExemplarDeckCompanion'));

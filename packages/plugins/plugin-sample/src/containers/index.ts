//
// Copyright 2025 DXOS.org
//

// Container barrel with lazy exports.
// React.lazy enables code-splitting so container modules (and their dependencies)
// are only loaded when the surface is actually rendered. Each container file
// must have a `export default` for `lazy()` to work.

import { type ComponentType, lazy } from 'react';

export const SampleArticle: ComponentType<any> = lazy(() => import('./SampleArticle'));
export const SampleSettings: ComponentType<any> = lazy(() => import('./SampleSettings'));
export const SampleObjectSettings: ComponentType<any> = lazy(() => import('./SampleObjectSettings'));
export const SampleCompanionPanel: ComponentType<any> = lazy(() => import('./SampleCompanionPanel'));
export const SampleDeckCompanion: ComponentType<any> = lazy(() => import('./SampleDeckCompanion'));

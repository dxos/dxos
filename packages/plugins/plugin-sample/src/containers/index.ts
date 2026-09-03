//
// Copyright 2025 DXOS.org
//

// Container barrel with lazy exports.
// React.lazy enables code-splitting so container modules (and their dependencies)
// are only loaded when the surface is actually rendered. Each container file
// must have a `export default` for `lazy()` to work.

import { type ComponentType, lazy } from 'react';

export const SampleArticle: ComponentType<any> = lazy(() => import('./SampleArticle.tsx'));
export const SampleProperties: ComponentType<any> = lazy(() => import('./SampleProperties.tsx'));
export const SampleCompanionPanel: ComponentType<any> = lazy(() => import('./SampleCompanionPanel.tsx'));
export const SampleDeckCompanion: ComponentType<any> = lazy(() => import('./SampleDeckCompanion.tsx'));

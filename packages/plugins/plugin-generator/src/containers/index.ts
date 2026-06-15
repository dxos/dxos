//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const GenerationArticle: ComponentType<any> = lazy(() => import('./GenerationArticle'));
export const GenerationProperties: ComponentType<any> = lazy(() => import('./GenerationProperties'));
export const GeneratorSettings: ComponentType<any> = lazy(() => import('./GeneratorSettings'));

//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export * from './MarkdownEditor';

export const MarkdownSettings: ComponentType<any> = lazy(() => import('./MarkdownSettings'));

//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const PresentationRecordingsArticle: ComponentType<any> = lazy(
  () => import('./PresentationRecordingsArticle/index.ts'),
);
export const RecordButton: ComponentType<any> = lazy(() => import('./RecordButton/index.ts'));
export const RecorderSettings: ComponentType<any> = lazy(() => import('./RecorderSettings/index.ts'));
export const RecordingOverlay: ComponentType<any> = lazy(() => import('./RecordingOverlay/index.ts'));
export const SlideRecordingsArticle: ComponentType<any> = lazy(() => import('./SlideRecordingsArticle/index.ts'));

//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { PresenterOperation } from '#types';

export const PresenterOperationHandlerSet = OperationHandlerSet.lazy([
  PresenterOperation.SetPresenting.pipe(Operation.lazyHandler(() => import('./set-presenting.ts'))),
  PresenterOperation.CreatePresentation.pipe(Operation.lazyHandler(() => import('./create-presentation.ts'))),
  PresenterOperation.AddSection.pipe(Operation.lazyHandler(() => import('./add-section.ts'))),
  PresenterOperation.ListLayouts.pipe(Operation.lazyHandler(() => import('./list-layouts.ts'))),
  PresenterOperation.PresentObject.pipe(Operation.lazyHandler(() => import('./present-object.ts'))),
  PresenterOperation.GenerateSlideImage.pipe(Operation.lazyHandler(() => import('./generate-slide-image.ts'))),
]);

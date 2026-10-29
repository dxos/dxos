//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as FeatureOperation from '@dxos/plugin-projects/FeatureOperation';

import { PresenterOperation } from '#types';

export const PresenterOperationHandlerSet = OperationHandlerSet.lazy([
  PresenterOperation.SetPresenting.pipe(Operation.lazyHandler(() => import('./set-presenting.ts'))),
  PresenterOperation.CreatePresentation.pipe(Operation.lazyHandler(() => import('./create-presentation.ts'))),
  PresenterOperation.AddSection.pipe(Operation.lazyHandler(() => import('./add-section.ts'))),
  PresenterOperation.ListLayouts.pipe(Operation.lazyHandler(() => import('./list-layouts.ts'))),
  PresenterOperation.PresentObject.pipe(Operation.lazyHandler(() => import('./present-object.ts'))),
  PresenterOperation.GenerateSlideImage.pipe(Operation.lazyHandler(() => import('./generate-slide-image.ts'))),
  // Declared by plugin-projects, whose skill offers it; the deck it makes is this plugin's type.
  FeatureOperation.CreateShowcase.pipe(Operation.lazyHandler(() => import('./create-showcase.ts'))),
]);

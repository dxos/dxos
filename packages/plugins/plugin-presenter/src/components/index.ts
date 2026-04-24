//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export * from './Markdown';
export * from './Presenter';
export * from './RevealPlayer';

export const PresenterSettings: ComponentType<any> = lazy(() => import('./PresenterSettings'));

//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export * from './Chat';
export * from './TemplateEditor';
export * from './Toolbox';

export const AssistantSettings: ComponentType<any> = lazy(() => import('./AssistantSettings'));

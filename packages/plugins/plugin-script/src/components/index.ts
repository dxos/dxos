//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const ScriptPluginSettings: ComponentType<any> = lazy(() => import('./ScriptPluginSettings'));

export * from './FramePanel';
export * from './NotebookStack';
export * from './QueryEditor';
export * from './ScriptToolbar';
export * from './TestPanel';
export * from './TypescriptEditor';

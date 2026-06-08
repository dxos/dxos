//
// Copyright 2023 DXOS.org
//
// TODO(wittjosiah): Factor components out of plugin-assistant into a standalone package.

import { type ComponentType, lazy } from 'react';

export * from './AgentProperties';
export * from './Chat';
export * from './ProcessTree';
export * from './TaskList';
export * from './TemplateEditor';
export * from './Toolbox';

export const AssistantSettings: ComponentType<any> = lazy(() => import('./AssistantSettings'));
export const RoutineProperties: ComponentType<any> = lazy(() => import('./RoutineProperties'));

export { ChatPrompt, type ChatPromptProps } from './ChatPrompt/ChatPrompt';

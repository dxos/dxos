//
// Copyright 2023 DXOS.org
//
// TODO(wittjosiah): Factor components out of plugin-assistant into a standalone package.

import { type ComponentType, lazy } from 'react';

export * from './AgentProperties';
export * from './Chat';
export { TracePanel } from '../containers/TracePanel/TracePanel';
export * from './ProcessTree';
export * from './TaskList';
export * from './Toolbox';

export const AssistantSettings: ComponentType<any> = lazy(() => import('./AssistantSettings'));

export { ChatPrompt, type ChatPromptProps } from './ChatPrompt/ChatPrompt';

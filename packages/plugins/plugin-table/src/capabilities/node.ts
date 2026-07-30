//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import type { OperationHandlerSet } from '@dxos/compute';

// The capabilities `TablePlugin.node` activates, and only those. `Capability.lazy` defers the
// import at runtime but a bundler still walks it, so listing the React surfaces here would pull
// the plugin's components into every node and bun build.

export const SkillDefinition = Capability.lazy('SkillDefinition', () => import('./skill-definition'));
export const CommentConfig = Capability.lazy('CommentConfig', () => import('./comment-config'));
export const CreateObject = Capability.lazy('CreateObject', () => import('./create-object'));
export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);

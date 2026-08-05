//
// Copyright 2026 DXOS.org
//

import { AppCapability } from '@dxos/app-toolkit';
import { SpaceCapability } from '@dxos/plugin-space';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
export const CommentConfig = AppCapability.commentConfig(() => import('./comment-config'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));

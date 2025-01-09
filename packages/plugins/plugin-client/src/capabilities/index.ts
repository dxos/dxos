//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework/next';

export const Client = lazy(async () => import('./client'));
export const GraphBuilder = lazy(async () => import('./graph-builder'));
export const IntentResolver = lazy(async () => import('./intent-resolver'));
export const ReactContext = lazy(async () => import('./react-context'));
export const Surface = lazy(async () => import('./surface'));

export * from './capabilities';

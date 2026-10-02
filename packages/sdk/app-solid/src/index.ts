//
// Copyright 2025 DXOS.org
//

export * from '@dxos/app-framework';

// Named, so the Solid hooks shadow the React hooks of the same names on the framework barrel.
export { useAppGraph, useLayout, useOperationInvoker } from './common.ts';
export { useCapabilities, useCapability } from './useCapabilities.ts';
export { usePluginManager } from './usePluginManager.ts';

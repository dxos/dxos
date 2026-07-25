//
// Copyright 2025 DXOS.org
//

// The generic surface-grid container is re-exported so stories keep importing `ModuleContainer`
// from `../testing`; the assistant-specific wrapper is gone (layout + skills now flow through the
// harness).
export { ModuleContainer, type ModuleLayout } from '@dxos/storybook-testing';

export * from './data';
export * from './decorators';
export * from './modules';
export * from './objects';
export * from './profiles';
export * from './schema';
export * from './snapshot';

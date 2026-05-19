//
// Copyright 2026 DXOS.org
//

// Re-export the canonical File type from @dxos/types under the existing
// `FileType` alias used throughout this plugin (and by @dxos/plugin-wnfs).
// eslint-disable-next-line @dxos/rules/import-as-namespace
export { File as FileType } from '@dxos/types';

export * from './limits';
export * from './types';

export * as FileCapabilities from './FileCapabilities';
export * as FileOperation from './FileOperation';
export * as Settings from './Settings';

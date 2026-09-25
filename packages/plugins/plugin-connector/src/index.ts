//
// Copyright 2025 DXOS.org
//

// The API is namespaced, and each namespace is also a subpath (`@dxos/plugin-connector/Binding`) so a
// consumer of one predicate does not pull the whole plugin in behind it.
export * as Binding from './Binding.ts';
export * as ConnectorAuth from './ConnectorAuth.ts';
export * as ConnectorPlugin from './ConnectorPlugin.ts';
export * as SyncTemplate from './SyncTemplate.ts';
export * from './errors.ts';
export * from '#meta';
export * from '#types';

//
// Copyright 2025 DXOS.org
//

// The API is namespaced, and each namespace is also a subpath (`@dxos/plugin-connector/Binding`) so a
// consumer of one predicate does not pull the whole plugin in behind it.
export * as Binding from './Binding';
export * as ConnectorAuth from './ConnectorAuth';
export * as ConnectorPlugin from './ConnectorPlugin';
export * as SyncTemplate from './SyncTemplate';
export * from './errors';
export * from '#meta';
export * from '#types';

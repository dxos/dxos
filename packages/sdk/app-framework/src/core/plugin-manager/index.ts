//
// Copyright 2026 DXOS.org
//

// The manager's public surface. The sibling modules (state, catalog, scheduler, graph,
// loader) are internal collaborators — import them only from within this directory.
export * from './plugin-manager.ts';
export { PluginManagerContext as Context } from '../../context.ts';
export {
  DependencyCycleError,
  DuplicateProviderError,
  MissingProviderError,
  ModuleActivationError,
  ProvidesMismatchError,
} from '../errors.ts';

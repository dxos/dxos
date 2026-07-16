//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/**
 * A requested capability has no contributions in the capability manager.
 */
export class CapabilityNotFoundError extends BaseError.extend('CapabilityNotFoundError', 'Capability not found') {
  constructor({ identifier, registered, cause }: { identifier: string; registered?: string[]; cause?: unknown }) {
    super({ context: { identifier, registered }, cause });
  }
}

/**
 * A module's activate effect failed.
 */
export class ModuleActivationError extends BaseError.extend('ModuleActivationError', 'Module activation failed') {
  constructor({ module, plugin, cause }: { module: string; plugin?: string; cause?: unknown }) {
    super({ context: { module, plugin }, cause });
  }
}

/**
 * The capability dependency graph contains a cycle among dependency-mode modules.
 */
export class DependencyCycleError extends BaseError.extend('DependencyCycleError', 'Capability dependency cycle') {
  constructor({ path }: { path: Array<{ module: string; capability: string }> }) {
    super({ context: { path } });
  }
}

/**
 * A dependency-mode module requires a singleton capability with no eligible provider.
 */
export class MissingProviderError extends BaseError.extend(
  'MissingProviderError',
  'No provider for required capability',
) {
  constructor({
    capability,
    requiredBy,
    registered,
    hint,
  }: {
    capability: string;
    requiredBy: string[];
    registered?: string[];
    /**
     * `event-gated`: a provider exists but only activates on a runtime event, so it cannot
     * satisfy a startup requirement. `legacy-candidate`: a legacy module may provide it.
     */
    hint?: 'event-gated' | 'legacy-candidate';
  }) {
    super({ context: { capability, requiredBy, registered, hint } });
  }
}

/**
 * More than one dependency-mode module declares that it provides the same singleton capability.
 */
export class DuplicateProviderError extends BaseError.extend(
  'DuplicateProviderError',
  'Multiple providers for singleton capability',
) {
  constructor({ capability, providers }: { capability: string; providers: string[] }) {
    super({ context: { capability, providers } });
  }
}

/**
 * A module's activate return does not exactly cover its declared provides.
 */
export class ProvidesMismatchError extends BaseError.extend(
  'ProvidesMismatchError',
  'Activate return does not match declared provides',
) {
  constructor({ module, missing, undeclared }: { module: string; missing: string[]; undeclared: string[] }) {
    super({ context: { module, missing, undeclared } });
  }
}

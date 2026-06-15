//
// Copyright 2025 DXOS.org
//

/**
 * Capability identifier strings, kept in a dependency-free module so headless
 * consumers (activation events, edge runtimes) can reference them without
 * pulling in the full {@link AppCapabilities} registry and its UI-tied deps.
 */

export const LAYOUT_CAPABILITY_ID = 'org.dxos.app-framework.capability.layout';

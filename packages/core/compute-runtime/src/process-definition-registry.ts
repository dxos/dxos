//
// Copyright 2026 DXOS.org
//

import type { Process } from '@dxos/compute';

/**
 * Maps a {@link Process.Process.key} to its live definition so the
 * {@link ProcessManager} can rehydrate processes after a restart. Definitions
 * carry runtime closures (e.g. an agent's MCP server provider) that cannot be
 * serialized, so plugins must re-register them on every boot.
 */
export class ProcessDefinitionRegistry {
  readonly #byKey = new Map<string, Process.Process<any, any, any>>();

  register(definition: Process.Process<any, any, any>): void {
    this.#byKey.set(definition.key, definition);
  }

  get(key: string): Process.Process<any, any, any> | undefined {
    return this.#byKey.get(key);
  }
}

//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';

export type ProgressMonitorUpdate = {
  readonly label: string;
  readonly current: number;
  readonly total?: number;
  readonly note?: string;
};

/**
 * Mirrors one logical progress task into every contributed {@link AppCapabilities.ProgressRegistry}.
 * Inbox operations fan out the same way so all hosts stay in sync.
 */
export class ProgressMonitorBridge {
  readonly #registries: readonly AppCapabilities.ProgressRegistry[];
  readonly #handles = new Map<string, readonly AppCapabilities.ProgressMonitor[]>();

  constructor(registries: readonly AppCapabilities.ProgressRegistry[]) {
    this.#registries = registries;
  }

  update(key: string, update: ProgressMonitorUpdate): void {
    const handles = this.#handles.get(key) ?? this.#register(key, update);
    for (const handle of handles) {
      handle.set(update.current);
      if (update.total !== undefined) {
        handle.total(update.total);
      }
      if (update.note !== undefined) {
        handle.note(update.note);
      }
    }
  }

  remove(key: string): void {
    const handles = this.#handles.get(key);
    if (!handles) {
      return;
    }
    for (const handle of handles) {
      handle.remove();
    }
    this.#handles.delete(key);
  }

  clear(): void {
    for (const key of [...this.#handles.keys()]) {
      this.remove(key);
    }
  }

  #register(key: string, update: ProgressMonitorUpdate): readonly AppCapabilities.ProgressMonitor[] {
    const handles = this.#registries.map((registry) =>
      registry.register(key, { label: update.label, total: update.total }),
    );
    this.#handles.set(key, handles);
    return handles;
  }
}

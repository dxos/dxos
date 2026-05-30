//
// Copyright 2026 DXOS.org
//

/**
 * Page side of the composer-crx extension's ping contract — a health-check round-trip that proves
 * the page → content-script → background messaging path and reports the extension's identity.
 *
 * The event names and wire shapes mirror `packages/apps/composer-crx/src/search-proxy/types.ts`
 * (the source of truth); they are re-declared here because the plugin must not depend on the
 * extension app package.
 */

const PING_EVENT = 'composer:search-proxy:ping';
const PING_ACK_EVENT = 'composer:search-proxy:ping:ack';
const RENDER_READY_DATASET_KEY = 'composerSearchProxy';
const DEFAULT_PING_TIMEOUT_MS = 4_000;

export type ExtensionInfo = {
  extensionVersion: string;
  extensionName: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

let counter = 0;
const nextId = (): string => globalThis.crypto?.randomUUID?.() ?? `ping-${(counter += 1)}`;

/**
 * Whether the composer-crx extension's relay is installed on this page (set via a `documentElement`
 * dataset marker once the relay is listening).
 */
export const isExtensionAvailable = (): boolean =>
  typeof document !== 'undefined' && document.documentElement?.dataset[RENDER_READY_DATASET_KEY] === '1';

/**
 * Ping the composer-crx extension and resolve with its identity. Rejects if the extension is not
 * detected, rejects the request, or does not ack within the timeout.
 */
export const pingExtension = (timeoutMs: number = DEFAULT_PING_TIMEOUT_MS): Promise<ExtensionInfo> =>
  new Promise<ExtensionInfo>((resolve, reject) => {
    if (typeof window === 'undefined' || !isExtensionAvailable()) {
      reject(new Error('Extension not detected'));
      return;
    }

    const id = nextId();
    let settled = false;

    const cleanup = () => {
      window.removeEventListener(PING_ACK_EVENT, onAck);
      clearTimeout(timer);
    };

    const onAck = (event: Event) => {
      const detail = 'detail' in event ? event.detail : undefined;
      if (!isRecord(detail) || detail.id !== id || settled) {
        return;
      }
      settled = true;
      cleanup();
      if (detail.ok === true && typeof detail.extensionVersion === 'string' && typeof detail.extensionName === 'string') {
        resolve({ extensionVersion: detail.extensionVersion, extensionName: detail.extensionName });
      } else {
        const error = typeof detail.error === 'string' ? detail.error : 'unknown';
        reject(new Error(`Extension ping failed: ${error}`));
      }
    };

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(new Error(`Extension did not respond within ${timeoutMs}ms`));
    }, timeoutMs);

    window.addEventListener(PING_ACK_EVENT, onAck);
    window.dispatchEvent(new CustomEvent(PING_EVENT, { detail: { version: 1, id } }));
  });

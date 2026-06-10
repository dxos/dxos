//
// Copyright 2026 DXOS.org
//

/**
 * Page-actions wire protocol.
 *
 * Extension-side mirror of `@dxos/plugin-crx`'s `types/PageAction.ts` — the
 * two modules MUST stay in sync. The extension does not depend on `effect`,
 * so the shapes are plain TypeScript types with hand-rolled validators in the
 * style of `../search-proxy/types.ts`.
 *
 * Composer plugins contribute page actions; the extension caches their
 * serializable descriptors and surfaces them on web pages (popup toolbar,
 * context menu). The page and the extension exchange messages over
 * same-origin `window` CustomEvents (page <-> content script) and runtime
 * messages (content script <-> background). Both ends decode through the
 * exported validators so a malformed payload is rejected rather than trusted.
 */

/**
 * Window CustomEvent name the content script dispatches on a Composer page to
 * request the list of contributed page actions.
 */
export const PAGE_ACTIONS_LIST_EVENT = 'composer:page-actions:list';

/**
 * Window CustomEvent name the Composer page dispatches with the list ack.
 */
export const PAGE_ACTIONS_LIST_ACK_EVENT = 'composer:page-actions:list:ack';

/**
 * Window CustomEvent name the content script dispatches on a Composer page to
 * invoke a page action with extracted inputs.
 */
export const PAGE_ACTION_INVOKE_EVENT = 'composer:page-action:invoke';

/**
 * Window CustomEvent name the Composer page dispatches with the invoke ack.
 */
export const PAGE_ACTION_INVOKE_ACK_EVENT = 'composer:page-action:invoke:ack';

/**
 * Runtime message `type` discriminator asking the background worker for the
 * cached page-actions registry.
 */
export const PAGE_ACTIONS_LIST_MESSAGE_TYPE = 'composer-crx:page-actions:list';

/**
 * Runtime message `type` discriminator the Composer-tab content relay forwards
 * to the background worker to deliver an invoke request to the page.
 */
export const PAGE_ACTION_INVOKE_MESSAGE_TYPE = 'composer-crx:page-action:invoke';

/**
 * Runtime message `type` discriminator the popup sends to the background
 * worker to run a page action end-to-end (extract + invoke).
 */
export const PAGE_ACTION_RUN_MESSAGE_TYPE = 'composer-crx:page-action:run';

/**
 * Runtime message `type` discriminator the background worker sends to a tab's
 * content script to run an extractor against the page DOM.
 */
export const PAGE_ACTION_EXTRACT_MESSAGE_TYPE = 'composer-crx:page-action:extract';

/**
 * Runtime message `type` discriminator the background worker (or popup) sends
 * to a tab's content script to evaluate an action's DOM predicate.
 */
export const PAGE_ACTION_PREDICATE_MESSAGE_TYPE = 'composer-crx:page-action:predicate';

/**
 * Runtime message `type` discriminator the Composer-tab content relay sends to
 * the background worker once the page-actions bridge is listening.
 */
export const PAGE_ACTIONS_READY_MESSAGE_TYPE = 'composer-crx:page-actions:ready';

/**
 * `chrome.storage` key for the cached {@link PageActionsRegistry}.
 */
export const PAGE_ACTIONS_STORAGE_KEY = 'composer-crx:page-actions-registry';

/**
 * Where a page action can be surfaced.
 */
export type PageActionContext = 'popup' | 'page' | 'selection' | 'link';

const PAGE_ACTION_CONTEXTS: readonly string[] = ['popup', 'page', 'selection', 'link'];

/**
 * Serializable page-action descriptor cached in the extension's registry.
 * `operation` carries the operation key for display/diagnostics only —
 * invocation is correlated by `id`.
 */
export type PageActionDescriptor = {
  id: string;
  label: string;
  icon: string;
  urlPatterns: string[];
  /** Lazy DOM condition evaluated at popup-open / invoke time. */
  predicate?: { exists: string };
  /** Named built-in extractor reference (extension-bundled), with optional params. */
  extractor: { name: string; params?: unknown };
  contexts: PageActionContext[];
  operation: string;
};

/**
 * Cached registry of page actions, persisted under
 * {@link PAGE_ACTIONS_STORAGE_KEY}.
 */
export type PageActionsRegistry = { fetchedAt: string; actions: PageActionDescriptor[] };

/**
 * Reply to a page-actions list request.
 */
export type ListAck =
  | { version: 1; id: string; ok: true; actions: PageActionDescriptor[] }
  | { version: 1; id: string; ok: false; error: string };

/**
 * Request to invoke a page action with inputs extracted from a page.
 */
export type InvokeRequest = {
  version: 1;
  /** Correlation id; the ack echoes it back. */
  id: string;
  actionId: string;
  page: { url: string; title: string; favicon?: string };
  inputs: unknown;
  invokedFrom: 'popup' | 'contextMenu';
};

/**
 * Reply to an {@link InvokeRequest}.
 */
export type InvokeAck =
  | { version: 1; id: string; ok: true; objectId?: string }
  | { version: 1; id: string; ok: false; error: string };

/**
 * Generic page capture produced by the extension's `snapshot` extractor.
 * Mirrors plugin-crx's `PageAction.Snapshot` (Clip source/selection/hints).
 */
export type Snapshot = {
  source: { url: string; title: string; favicon?: string; clippedAt: string };
  selection?: {
    text: string;
    html?: string;
    htmlTruncated?: boolean;
    rect?: { x: number; y: number; width: number; height: number };
  };
  hints?: {
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    jsonLd?: unknown[];
    h1?: string;
    firstImage?: string;
  };
  html?: string;
  htmlTruncated?: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const isPageActionContext = (value: unknown): value is PageActionContext =>
  typeof value === 'string' && PAGE_ACTION_CONTEXTS.includes(value);

/**
 * Validate and narrow an unknown value to a {@link PageActionDescriptor}.
 * Returns `undefined` if any required field is missing or mistyped; unknown
 * extra fields are tolerated (forward compatibility) and unknown `contexts`
 * values are filtered out. Copies only known fields into the result.
 */
export const decodeDescriptor = (value: unknown): PageActionDescriptor | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  if (typeof value.id !== 'string' || typeof value.label !== 'string' || typeof value.icon !== 'string') {
    return undefined;
  }
  if (!isStringArray(value.urlPatterns)) {
    return undefined;
  }
  if (value.predicate !== undefined && (!isRecord(value.predicate) || typeof value.predicate.exists !== 'string')) {
    return undefined;
  }
  if (!isRecord(value.extractor) || typeof value.extractor.name !== 'string') {
    return undefined;
  }
  if (!Array.isArray(value.contexts)) {
    return undefined;
  }
  if (typeof value.operation !== 'string') {
    return undefined;
  }

  const descriptor: PageActionDescriptor = {
    id: value.id,
    label: value.label,
    icon: value.icon,
    urlPatterns: [...value.urlPatterns],
    extractor: { name: value.extractor.name },
    contexts: value.contexts.filter(isPageActionContext),
    operation: value.operation,
  };
  if (isRecord(value.predicate) && typeof value.predicate.exists === 'string') {
    descriptor.predicate = { exists: value.predicate.exists };
  }
  if (value.extractor.params !== undefined) {
    descriptor.extractor.params = value.extractor.params;
  }
  return descriptor;
};

/**
 * Validate and narrow an unknown value to a {@link PageActionsRegistry}.
 * Storage content survives extension upgrades, so it is treated as untrusted
 * input: malformed descriptor entries are DROPPED rather than failing the
 * whole registry, and a structurally invalid value yields `undefined`.
 */
export const decodeRegistry = (value: unknown): PageActionsRegistry | undefined => {
  if (!isRecord(value) || typeof value.fetchedAt !== 'string' || !Array.isArray(value.actions)) {
    return undefined;
  }
  const actions: PageActionDescriptor[] = [];
  for (const entry of value.actions) {
    const descriptor = decodeDescriptor(entry);
    if (descriptor) {
      actions.push(descriptor);
    }
  }
  return { fetchedAt: value.fetchedAt, actions };
};

/**
 * Validate and narrow an unknown value to a {@link ListAck}. On ok acks,
 * malformed descriptor entries are DROPPED rather than failing the whole ack
 * so one bad contribution cannot hide the rest.
 */
export const decodeListAck = (value: unknown): ListAck | undefined => {
  if (!isRecord(value) || value.version !== 1 || typeof value.id !== 'string') {
    return undefined;
  }
  if (value.ok === true) {
    if (!Array.isArray(value.actions)) {
      return undefined;
    }
    const actions: PageActionDescriptor[] = [];
    for (const entry of value.actions) {
      const descriptor = decodeDescriptor(entry);
      if (descriptor) {
        actions.push(descriptor);
      }
    }
    return { version: 1, id: value.id, ok: true, actions };
  }
  if (value.ok === false) {
    if (typeof value.error !== 'string') {
      return undefined;
    }
    return { version: 1, id: value.id, ok: false, error: value.error };
  }
  return undefined;
};

/**
 * Validate and narrow an unknown value to an {@link InvokeAck}.
 */
export const decodeInvokeAck = (value: unknown): InvokeAck | undefined => {
  if (!isRecord(value) || value.version !== 1 || typeof value.id !== 'string') {
    return undefined;
  }
  if (value.ok === true) {
    if (value.objectId !== undefined && typeof value.objectId !== 'string') {
      return undefined;
    }
    const ack: InvokeAck = { version: 1, id: value.id, ok: true };
    if (typeof value.objectId === 'string') {
      ack.objectId = value.objectId;
    }
    return ack;
  }
  if (value.ok === false) {
    if (typeof value.error !== 'string') {
      return undefined;
    }
    return { version: 1, id: value.id, ok: false, error: value.error };
  }
  return undefined;
};

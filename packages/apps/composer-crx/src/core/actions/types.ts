//
// Copyright 2026 DXOS.org
//

import type { PageAction } from '@dxos/crx-protocol';

/**
 * Page-actions wire protocol (extension side).
 *
 * The serializable *shapes* are the single source of truth in `@dxos/crx-protocol` and are imported
 * here **type-only** (erased at build) — so the extension, and in particular the per-page content
 * script, carries no `effect` runtime. Decoding is done by the hand-rolled validators below (also
 * `effect`-free) rather than `effect/Schema`, keeping the content-script bundle lean.
 *
 * Composer plugins contribute page actions; the extension caches their serializable descriptors and
 * surfaces them on web pages (popup toolbar, context menu). The page and the extension exchange
 * messages over same-origin `window` CustomEvents (page <-> content script) and runtime messages
 * (content script <-> background). Both ends decode through the exported validators so a malformed
 * payload is rejected rather than trusted.
 *
 * The cross-tab CustomEvent name constants below are plain string literals (not imported, to avoid
 * pulling the `effect`-based schema module at runtime); their values MUST match the corresponding
 * `PageAction.*_EVENT` constants in `@dxos/crx-protocol`.
 */

/**
 * Window CustomEvent name the content script dispatches on a Composer page to
 * request the list of contributed page actions. Matches `PageAction.LIST_EVENT`.
 */
export const PAGE_ACTIONS_LIST_EVENT = 'composer:page-actions:list';

/**
 * Window CustomEvent name the Composer page dispatches with the list ack. Matches `PageAction.LIST_ACK_EVENT`.
 */
export const PAGE_ACTIONS_LIST_ACK_EVENT = 'composer:page-actions:list:ack';

/**
 * Window CustomEvent name the content script dispatches on a Composer page to
 * invoke a page action with extracted inputs. Matches `PageAction.INVOKE_EVENT`.
 */
export const PAGE_ACTION_INVOKE_EVENT = 'composer:page-action:invoke';

/**
 * Window CustomEvent name the Composer page dispatches with the invoke ack. Matches `PageAction.INVOKE_ACK_EVENT`.
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
 * Runtime message `type` discriminator the content script sends to the
 * background worker to deliver a picker-captured snapshot for invocation.
 */
export const PAGE_ACTION_DELIVER_MESSAGE_TYPE = 'composer-crx:page-action:deliver';

/**
 * Window CustomEvent dispatched by the Composer page once its page-actions
 * listeners are attached. Matches `PageAction.READY_EVENT`. The content-script
 * relay listens for this and forwards a ready runtime message to the background.
 */
export const PAGE_ACTIONS_PAGE_READY_EVENT = 'composer:page-actions:ready';

/**
 * Runtime message `type` discriminator the Composer-tab content relay sends to
 * the background worker to indicate the page-actions bridge is ready to
 * receive requests. Sent both at relay install time (for pages that are already
 * booted) and when the page dispatches {@link PAGE_ACTIONS_PAGE_READY_EVENT}
 * (for pages that boot after the content script).
 */
export const PAGE_ACTIONS_READY_MESSAGE_TYPE = 'composer-crx:page-actions:ready';

/**
 * `chrome.storage` key for the cached {@link PageActionsRegistry}.
 */
export const PAGE_ACTIONS_STORAGE_KEY = 'composer-crx:page-actions-registry';

/**
 * Where a page action can be surfaced.
 */
export type PageActionContext = PageAction.Context;

const PAGE_ACTION_CONTEXTS: readonly string[] = ['popup', 'page', 'selection', 'link', 'picker'];

/**
 * Serializable page-action descriptor cached in the extension's registry.
 * `operation` carries the operation key for display/diagnostics only —
 * invocation is correlated by `id`.
 */
export type PageActionDescriptor = PageAction.Descriptor;

/**
 * Cached registry of page actions, persisted under {@link PAGE_ACTIONS_STORAGE_KEY}.
 * Extension-local (not part of the wire protocol): wraps the shared descriptors with a fetch time.
 */
export type PageActionsRegistry = { fetchedAt: string; actions: PageActionDescriptor[] };

/**
 * Reply to a page-actions list request.
 */
export type ListAck = PageAction.ListAck;

/**
 * Request to invoke a page action with inputs extracted from a page.
 */
export type InvokeRequest = PageAction.InvokeRequest;

/**
 * Reply to an {@link InvokeRequest}.
 */
export type InvokeAck = PageAction.InvokeAck;

/**
 * Generic page capture produced by the extension's `snapshot` extractor.
 */
export type Snapshot = PageAction.Snapshot;

/** Nominal alias for the selection sub-shape of a {@link Snapshot}. */
export type SnapshotSelection = NonNullable<PageAction.Snapshot['selection']>;

/** Nominal alias for the hints sub-shape of a {@link Snapshot}. */
export type SnapshotHints = NonNullable<PageAction.Snapshot['hints']>;

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

  // Build immutably: the shared schema types are readonly, so fields cannot be assigned post-construction.
  const predicate =
    isRecord(value.predicate) && typeof value.predicate.exists === 'string'
      ? { exists: value.predicate.exists }
      : undefined;
  const extractor =
    value.extractor.params !== undefined
      ? { name: value.extractor.name, params: value.extractor.params }
      : { name: value.extractor.name };

  return {
    id: value.id,
    label: value.label,
    icon: value.icon,
    urlPatterns: [...value.urlPatterns],
    extractor,
    contexts: value.contexts.filter(isPageActionContext),
    operation: value.operation,
    ...(predicate ? { predicate } : {}),
  };
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
    return typeof value.objectId === 'string'
      ? { version: 1, id: value.id, ok: true, objectId: value.objectId }
      : { version: 1, id: value.id, ok: true };
  }
  if (value.ok === false) {
    if (typeof value.error !== 'string') {
      return undefined;
    }
    return { version: 1, id: value.id, ok: false, error: value.error };
  }
  return undefined;
};

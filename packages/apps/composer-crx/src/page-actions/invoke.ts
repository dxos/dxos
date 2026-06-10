//
// Copyright 2026 DXOS.org
//

import browser from 'webextension-polyfill';

import { log } from '@dxos/log';

import { findComposerTab, openComposerTab } from '../bridge/sender';
import { getRegistry } from './registry';
import {
  type InvokeAck,
  type InvokeRequest,
  PAGE_ACTION_EXTRACT_MESSAGE_TYPE,
  PAGE_ACTION_INVOKE_MESSAGE_TYPE,
  decodeInvokeAck,
} from './types';

const OPEN_RETRY_INTERVAL_MS = 1_500;
const OPEN_RETRY_ATTEMPTS = 10;

let counter = 0;
const nextId = (): string => globalThis.crypto?.randomUUID?.() ?? `invoke-${(counter += 1)}`;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/**
 * Minimal, injectable surface of the tab/messaging operations `deliverInvoke`
 * depends on. Structurally satisfied by the live `bridge/sender` helpers and
 * `browser.tabs.sendMessage` so no cast is needed, while remaining trivially
 * mockable in tests (mirrors `search-proxy/render.ts`'s `RenderBrowserApi`).
 */
export interface InvokeBridgeApi {
  findComposerTab(): Promise<{ id?: number } | undefined>;
  openComposerTab(): Promise<void>;
  sendMessage(tabId: number, message: unknown): Promise<unknown>;
}

const defaultApi: InvokeBridgeApi = {
  findComposerTab,
  openComposerTab,
  sendMessage: (tabId, message) => browser.tabs.sendMessage(tabId, message),
};

export type DeliverInvokeOptions = {
  retryIntervalMs?: number;
  retryAttempts?: number;
};

/**
 * Deliver an invoke request to a Composer tab, opening one (and retrying
 * while it boots) when none is available. A `timeout` ack during the retry
 * window is treated as "app still booting" and retried.
 */
export const deliverInvoke = async (
  request: InvokeRequest,
  api: InvokeBridgeApi = defaultApi,
  options: DeliverInvokeOptions = {},
): Promise<InvokeAck> => {
  const { retryIntervalMs = OPEN_RETRY_INTERVAL_MS, retryAttempts = OPEN_RETRY_ATTEMPTS } = options;
  let opened = false;
  for (let attempt = 0; attempt < retryAttempts; attempt++) {
    const tab = await api.findComposerTab();
    if (tab?.id === undefined) {
      if (!opened) {
        await api.openComposerTab();
        opened = true;
      }
      await sleep(retryIntervalMs);
      continue;
    }
    try {
      const response = await api.sendMessage(tab.id, { type: PAGE_ACTION_INVOKE_MESSAGE_TYPE, request });
      const ack = decodeInvokeAck(response);
      if (ack && !(opened && !ack.ok && ack.error === 'timeout')) {
        return ack;
      }
    } catch (err) {
      // Content script not ready yet (tab still loading) — retry.
      log.info('invoke delivery retry', { attempt, error: err instanceof Error ? err.message : String(err) });
    }
    await sleep(retryIntervalMs);
  }
  return { version: 1, id: request.id, ok: false, error: 'timeout' };
};

/**
 * Narrow the content script's extract response. The reply crosses the
 * runtime-messaging boundary as `unknown`; on failure replies the inner
 * `error` string is propagated, defaulting to `extractorFailed`.
 */
const decodeExtractResult = (value: unknown): { ok: true; inputs: unknown } | { ok: false; error: string } => {
  if (!isRecord(value)) {
    return { ok: false, error: 'extractorFailed' };
  }
  if (value.ok === true) {
    return { ok: true, inputs: value.inputs };
  }
  return { ok: false, error: typeof value.error === 'string' ? value.error : 'extractorFailed' };
};

/**
 * Run a page action end-to-end: extract inputs on the source tab, then
 * deliver the invoke request to Composer.
 */
export const runPageAction = async ({ actionId, tabId }: { actionId: string; tabId: number }): Promise<InvokeAck> => {
  const { actions } = await getRegistry();
  const action = actions.find((candidate) => candidate.id === actionId);
  if (!action) {
    return { version: 1, id: '', ok: false, error: 'unknownAction' };
  }

  let tab: browser.Tabs.Tab;
  let extracted: unknown;
  try {
    tab = await browser.tabs.get(tabId);
    extracted = await browser.tabs.sendMessage(tabId, {
      type: PAGE_ACTION_EXTRACT_MESSAGE_TYPE,
      name: action.extractor.name,
      params: action.extractor.params,
    });
  } catch (err) {
    log.catch(err);
    return { version: 1, id: '', ok: false, error: 'extractorFailed' };
  }

  const result = decodeExtractResult(extracted);
  if (!result.ok) {
    return { version: 1, id: '', ok: false, error: result.error };
  }

  const request: InvokeRequest = {
    version: 1,
    id: nextId(),
    actionId: action.id,
    page: { url: tab.url ?? '', title: tab.title ?? '' },
    inputs: result.inputs,
    invokedFrom: 'popup',
  };
  return deliverInvoke(request);
};

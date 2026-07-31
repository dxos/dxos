//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

import { type DeliverInvokeOptions, type InvokeBridgeApi, deliverInvoke } from './invoke';
import { enrichSnapshotWithThumbnail } from './thumbnail';
import { type InvokeAck, type InvokeRequest, type Snapshot, type SnapshotHints, type SnapshotSelection } from './types';
import { nextId } from './util';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** Structurally validate the optional selection sub-object; `undefined` if absent/invalid. */
const decodeSelection = (value: unknown): SnapshotSelection | undefined => {
  if (!isRecord(value) || typeof value.text !== 'string') {
    return undefined;
  }
  const rect = value.rect;
  const decodedRect =
    isRecord(rect) &&
    typeof rect.x === 'number' &&
    typeof rect.y === 'number' &&
    typeof rect.width === 'number' &&
    typeof rect.height === 'number'
      ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
      : undefined;
  return {
    text: value.text,
    ...(typeof value.html === 'string' ? { html: value.html } : {}),
    ...(typeof value.htmlTruncated === 'boolean' ? { htmlTruncated: value.htmlTruncated } : {}),
    ...(decodedRect ? { rect: decodedRect } : {}),
  };
};

/** Structurally validate the optional hints sub-object; `undefined` if absent. */
const decodeHints = (value: unknown): SnapshotHints | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  return {
    ...(typeof value.ogTitle === 'string' ? { ogTitle: value.ogTitle } : {}),
    ...(typeof value.ogDescription === 'string' ? { ogDescription: value.ogDescription } : {}),
    ...(typeof value.ogImage === 'string' ? { ogImage: value.ogImage } : {}),
    ...(typeof value.h1 === 'string' ? { h1: value.h1 } : {}),
    ...(typeof value.firstImage === 'string' ? { firstImage: value.firstImage } : {}),
    ...(Array.isArray(value.jsonLd) ? { jsonLd: value.jsonLd } : {}),
  };
};

/**
 * Validate an inbound runtime-message payload for the deliver handler.
 * The message crosses a trust boundary (content script → background worker),
 * so every required field is checked before `deliverPickedSnapshot` is called.
 * Returns the typed payload on success, `undefined` on any validation failure.
 *
 * Built immutably (the shared schema types are readonly): validate the required
 * shape, copy known fields via conditional spreads, tolerate unknown extras.
 */
export const decodeDeliverPayload = (value: unknown): { actionId: string; snapshot: Snapshot } | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  if (typeof value.actionId !== 'string') {
    return undefined;
  }
  const raw = value.snapshot;
  if (!isRecord(raw)) {
    return undefined;
  }
  const rawSource = raw.source;
  if (!isRecord(rawSource) || typeof rawSource.url !== 'string' || typeof rawSource.title !== 'string') {
    return undefined;
  }
  if (typeof rawSource.clippedAt !== 'string') {
    return undefined;
  }

  const source: Snapshot['source'] = {
    url: rawSource.url,
    title: rawSource.title,
    clippedAt: rawSource.clippedAt,
    ...(typeof rawSource.favicon === 'string' ? { favicon: rawSource.favicon } : {}),
  };

  const selection = decodeSelection(raw.selection);
  const hints = decodeHints(raw.hints);
  const snapshot: Snapshot = {
    source,
    ...(selection ? { selection } : {}),
    ...(hints ? { hints } : {}),
    ...(typeof raw.imageData === 'string' ? { imageData: raw.imageData } : {}),
    ...(typeof raw.html === 'string' ? { html: raw.html } : {}),
    ...(typeof raw.htmlTruncated === 'boolean' ? { htmlTruncated: raw.htmlTruncated } : {}),
  };

  return { actionId: value.actionId, snapshot };
};

/**
 * Deliver a picker-captured snapshot to Composer as a page-action invocation.
 * The snapshot's own source describes the page (the picker runs in the page it
 * captures), so no separate tab lookup is needed.
 *
 * The function backs a runtime-message response and must always resolve with a
 * well-formed ack — a rejection would bypass the caller's notification fallback
 * and leave the user without feedback.
 */
export const deliverPickedSnapshot = async (
  { actionId, snapshot }: { actionId: string; snapshot: Snapshot },
  api?: InvokeBridgeApi,
  options: DeliverInvokeOptions = {},
): Promise<InvokeAck> => {
  try {
    const inputs = await enrichSnapshotWithThumbnail(snapshot);
    const request: InvokeRequest = {
      version: 1,
      id: nextId(),
      actionId,
      page: { url: snapshot.source.url, title: snapshot.source.title, favicon: snapshot.source.favicon },
      inputs,
      invokedFrom: 'picker',
    };
    return await deliverInvoke(request, api, options);
  } catch (err) {
    log.catch(err);
    return { version: 1, id: '', ok: false, error: 'internal' };
  }
};

//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

import { type DeliverInvokeOptions, type InvokeBridgeApi, deliverInvoke } from './invoke';
import { enrichSnapshotWithThumbnail } from './thumbnail';
import { type InvokeAck, type InvokeRequest, type Snapshot } from './types';
import { nextId } from './util';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/**
 * Validate an inbound runtime-message payload for the deliver handler.
 * The message crosses a trust boundary (content script → background worker),
 * so every required field is checked before `deliverPickedSnapshot` is called.
 * Returns the typed payload on success, `undefined` on any validation failure.
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

  // Build the source sub-object from validated fields.
  const source: Snapshot['source'] = {
    url: rawSource.url,
    title: rawSource.title,
    clippedAt: rawSource.clippedAt,
  };
  if (typeof rawSource.favicon === 'string') {
    source.favicon = rawSource.favicon;
  }

  // Build the snapshot, copying optional sub-objects through structural guards
  // (mirrors the decodeDescriptor pattern: validate the required shape, copy
  // known fields, tolerate unknown extras).
  const snapshot: Snapshot = { source };

  if (isRecord(raw.selection) && typeof raw.selection.text === 'string') {
    const sel: NonNullable<Snapshot['selection']> = { text: raw.selection.text };
    if (typeof raw.selection.html === 'string') {
      sel.html = raw.selection.html;
    }
    if (typeof raw.selection.htmlTruncated === 'boolean') {
      sel.htmlTruncated = raw.selection.htmlTruncated;
    }
    if (
      isRecord(raw.selection.rect) &&
      typeof raw.selection.rect.x === 'number' &&
      typeof raw.selection.rect.y === 'number' &&
      typeof raw.selection.rect.width === 'number' &&
      typeof raw.selection.rect.height === 'number'
    ) {
      sel.rect = {
        x: raw.selection.rect.x,
        y: raw.selection.rect.y,
        width: raw.selection.rect.width,
        height: raw.selection.rect.height,
      };
    }
    snapshot.selection = sel;
  }

  if (isRecord(raw.hints)) {
    const hints: NonNullable<Snapshot['hints']> = {};
    if (typeof raw.hints.ogTitle === 'string') {
      hints.ogTitle = raw.hints.ogTitle;
    }
    if (typeof raw.hints.ogDescription === 'string') {
      hints.ogDescription = raw.hints.ogDescription;
    }
    if (typeof raw.hints.ogImage === 'string') {
      hints.ogImage = raw.hints.ogImage;
    }
    if (typeof raw.hints.h1 === 'string') {
      hints.h1 = raw.hints.h1;
    }
    if (typeof raw.hints.firstImage === 'string') {
      hints.firstImage = raw.hints.firstImage;
    }
    if (Array.isArray(raw.hints.jsonLd)) {
      hints.jsonLd = raw.hints.jsonLd;
    }
    snapshot.hints = hints;
  }

  if (typeof raw.imageData === 'string') {
    snapshot.imageData = raw.imageData;
  }
  if (typeof raw.html === 'string') {
    snapshot.html = raw.html;
  }
  if (typeof raw.htmlTruncated === 'boolean') {
    snapshot.htmlTruncated = raw.htmlTruncated;
  }

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

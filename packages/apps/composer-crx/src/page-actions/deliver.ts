//
// Copyright 2026 DXOS.org
//

import { type DeliverInvokeOptions, type InvokeBridgeApi, deliverInvoke } from './invoke';
import { enrichSnapshotWithThumbnail } from './thumbnail';
import { type InvokeAck, type InvokeRequest, type Snapshot } from './types';
import { nextId } from './util';

/**
 * Deliver a picker-captured snapshot to Composer as a page-action invocation.
 * The snapshot's own source describes the page (the picker runs in the page it
 * captures), so no separate tab lookup is needed.
 */
export const deliverPickedSnapshot = async (
  { actionId, snapshot }: { actionId: string; snapshot: Snapshot },
  api?: InvokeBridgeApi,
  options: DeliverInvokeOptions = {},
): Promise<InvokeAck> => {
  const inputs = await enrichSnapshotWithThumbnail(snapshot);
  const request: InvokeRequest = {
    version: 1,
    id: nextId(),
    actionId,
    page: { url: snapshot.source.url, title: snapshot.source.title, favicon: snapshot.source.favicon },
    inputs,
    invokedFrom: 'picker',
  };
  return deliverInvoke(request, api, options);
};

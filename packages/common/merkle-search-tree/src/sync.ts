import { invariant } from '@dxos/invariant';
import { digestEquals, formatDigest, makeItem } from './common';
import type { Tree } from './tree';
import type { Node } from './node';

export type SyncMessage = {
  nodes: SyncNode[];

  /**
   * Digests of requested nodes.
   */
  need: Uint8Array[];

  /**
   * Broadcast new root.
   */
  root: Uint8Array | null;
};

export type SyncNode = {
  digest: Uint8Array;
  childDigests: Uint8Array[] | null;
  items: SyncItem[] | null;
};

export type SyncItem = {
  key: string;
  value: Uint8Array;
};

export type Diff = {};

export function formatSyncMessage(message: SyncMessage): string {
  let res = '';
  for (const node of message.nodes) {
    res += ` - (${formatDigest(node.digest).slice(0, 8)})\n`;
    for (let i = 0; i < Math.max(node.items?.length ?? 0, node.childDigests?.length ?? 0); i++) {
      if (node.childDigests && i < node.childDigests.length) {
        res += `   + (${formatDigest(node.childDigests[i]).slice(0, 8)})\n`;
      }
      if (node.items && i < node.items.length) {
        res += `   - ${node.items[i].key}\n`;
      }
    }
  }
  return res;
}

import { invariant } from '@dxos/invariant';
import { digestEquals, formatDigest, makeItem } from './common';
import type { Tree } from './tree';
import type { Node } from './node';

export type SyncMessage = {
  nodes: SyncNode[];
};

export type SyncNode = {
  /**
   * List of indexes pointing to the location of this node, starting from the top of the tree.
   */
  path: number[];
  digest: Uint8Array;
  childDigests: Uint8Array[] | null;
  items: SyncItem[] | null;
};

export type SyncItem = {
  key: string;
  value: Uint8Array;
};

export type Diff = {};

export async function generateSyncMessage(own: Tree, remote: Tree): Promise<SyncMessage> {
  const message: SyncMessage = { nodes: [] };

  function processNode(ownNode: Node, remoteNode: Node | undefined, path: number[]) {
    invariant(ownNode.digest);
    if (remoteNode?.digest && digestEquals(ownNode.digest, remoteNode.digest)) {
      if (path.length === 0) {
        // Alway push the root hash even when it equals remote state.
        message.nodes.push({
          path,
          digest: ownNode.digest,
          childDigests: null,
          items: null,
        });
      }
      return;
    }
    message.nodes.push({
      path,
      digest: ownNode.digest,
      childDigests: ownNode.children.map((child) => {
        invariant(child.digest);
        return child.digest;
      }),
      items: ownNode.items.map((item) => ({ key: item.key, value: item.value })),
    });
  }

  processNode(own.root, remote.root, []);

  return message;
}

export async function receiveSyncMessage(own: Tree, remote: Tree, message: SyncMessage): Promise<Diff> {
  for (const syncNode of message.nodes) {
    if (syncNode.path.length > 0) {
      throw new Error('TODO: implement recursive sync');
    }

    const ownNode = remote.root;
    const remoteNode = remote.root;

    if (remoteNode.digest && digestEquals(remoteNode.digest, syncNode.digest)) {
      continue;
    }

    if (syncNode.items) {
      remoteNode.items = await Promise.all(syncNode.items.map((item) => makeItem(item.key, item.value)));
      remoteNode.dirty = true;
    }
    if (syncNode.childDigests) {
      for (let i = 0; i < syncNode.childDigests.length; i++) {
        if (
          i >= remoteNode.children.length ||
          !remoteNode.children[i].digest ||
          !digestEquals(remoteNode.children[i].digest!, syncNode.childDigests[i])
        ) {
          console.log(`child digest mismatch`);
        }
      }
      remoteNode.dirty = true;
    }
  }

  await remote.root.calculateDigest();

  return {};
}

export function formatSyncMessage(message: SyncMessage): string {
  let res = '';
  for (const node of message.nodes) {
    res += ` - (${formatDigest(node.digest).slice(0, 8)}) path=[${node.path}]\n`;
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

//
// Copyright 2024 DXOS.org
//

import type * as A from '@dxos/automerge/automerge';
import type { AutomergeUrl, DocHandle } from '@dxos/automerge/automerge-repo';
import { getSpaceKeyFromDoc } from '@dxos/echo-pipeline';
import { type SpaceDoc, SpaceDocVersion } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';

import { measureDocMetrics, type DocMetrics } from './automerge-metrics';

export class DatabaseRoot {
  constructor(private readonly _rootHandle: DocHandle<SpaceDoc>) {}

  get url() {
    return this._rootHandle.url;
  }

  get isLoaded(): boolean {
    return !!this._rootHandle.docSync();
  }

  get handle(): DocHandle<SpaceDoc> {
    return this._rootHandle;
  }

  docSync(): A.Doc<SpaceDoc> | null {
    return this._rootHandle.docSync();
  }

  getVersion(): SpaceDocVersion | null {
    const doc = this.docSync();
    if (!doc) {
      return null;
    }

    return doc.version ?? SpaceDocVersion.LEGACY;
  }

  getSpaceKey(): string | null {
    const doc = this.docSync();
    if (!doc) {
      return null;
    }

    return getSpaceKeyFromDoc(doc);
  }

  getInlineObjectCount(): number | null {
    const doc = this.docSync();
    if (!doc) {
      return null;
    }

    return Object.keys(doc.objects ?? {}).length;
  }

  getLinkedObjectCount(): number | null {
    const doc = this.docSync();
    if (!doc) {
      return null;
    }

    return Object.keys(doc.links ?? {}).length;
  }

  getAllLinkedDocuments(): AutomergeUrl[] {
    const doc = this.docSync();
    invariant(doc);

    return Object.values(doc.links ?? {}) as AutomergeUrl[];
  }

  measureMetrics(): DocMetrics | null {
    const doc = this.docSync();
    if (!doc) {
      return null;
    }
    return measureDocMetrics(doc);
  }
}

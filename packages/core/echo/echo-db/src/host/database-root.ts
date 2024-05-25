//
// Copyright 2024 DXOS.org
//

import type * as A from '@dxos/automerge/automerge';
import type { DocHandle } from '@dxos/automerge/automerge-repo';
import { getSpaceKeyFromDoc } from '@dxos/echo-pipeline';
import type { SpaceDoc } from '@dxos/echo-protocol';

import { measureDocMetrics, type DocMetrics } from './automerge-metrics';

export class DatabaseRoot {
  constructor(private readonly _rootHandle: DocHandle<SpaceDoc>) {}

  get url() {
    return this._rootHandle.url;
  }

  get isLoaded(): boolean {
    return !!this._rootHandle.docSync();
  }

  getSpaceKey(): string | null {
    const doc = this._docSync();
    if (!doc) {
      return null;
    }

    return getSpaceKeyFromDoc(doc);
  }

  getInlineObjectCount(): number | null {
    const doc = this._docSync();
    if (!doc) {
      return null;
    }

    return Object.keys(doc.objects ?? {}).length;
  }

  getLinkedObjectCount(): number | null {
    const doc = this._docSync();
    if (!doc) {
      return null;
    }

    return Object.keys(doc.links ?? {}).length;
  }

  measureMetrics(): DocMetrics | null {
    const doc = this._docSync();
    if (!doc) {
      return null;
    }
    return measureDocMetrics(doc);
  }

  private _docSync(): A.Doc<SpaceDoc> | null {
    return this._rootHandle.docSync();
  }
}

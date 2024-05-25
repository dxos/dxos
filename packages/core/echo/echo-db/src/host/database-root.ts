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
    const doc = this._rootHandle.docSync();
    if (!doc) {
      return null;
    }

    return getSpaceKeyFromDoc(doc);
  }

  measureMetrics(): DocMetrics | null {
    const doc = this._rootHandle.docSync();
    if (!doc) {
      return null;
    }
    return measureDocMetrics(doc);
  }
}

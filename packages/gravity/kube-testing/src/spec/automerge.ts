//
// Copyright 2023 DXOS.org
//

import { Server } from 'isomorphic-ws';

import { sleep } from '@dxos/async';
import { type Chunk, Repo, StorageAdapter, type StorageKey } from '@dxos/automerge/automerge-repo';
import { IndexedDBStorageAdapter } from '@dxos/automerge/automerge-repo-storage-indexeddb';
import { Context } from '@dxos/context';
import { AutomergeStorageAdapter } from '@dxos/echo-pipeline';
import { log } from '@dxos/log';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { SpanTimeDistributionCounter, trace } from '@dxos/tracing';
import { range } from '@dxos/util';

import {
  type AgentEnv,
  type AgentRunOptions,
  type PlanResults,
  type Platform,
  type TestParams,
  type TestPlan,
} from '../plan';
import { randomArraySlice } from '../util';

export type AutomergeTestSpec = {
  platform: Platform;
  agents: number;

  // Number of connections per client.
  clientConnections: number;

  clientStorage: 'none' | 'idb' | 'opfs';

  /**
   * Measure disk load time.
   */
  reloadStep: boolean;

  /**
   * Both server and client create docs.
   */
  symmetric: boolean;
  docCount: number;
  changeCount: number;
  contentKind: 'strings' | 'seq-numbers';
};

export type AutomergeAgentConfig = {
  agentIdx: number;
  port?: number;
  type: 'client' | 'server';
};

export class AutomergeTestPlan implements TestPlan<AutomergeTestSpec, AutomergeAgentConfig> {
  defaultSpec(): AutomergeTestSpec {
    return {
      platform: 'chromium',
      clientConnections: 1,

      clientStorage: 'idb',

      symmetric: false,
      agents: 2,
      docCount: 10000,
      changeCount: 10,
      contentKind: 'strings',

      reloadStep: true,
    };
  }

  async init({ spec }: TestParams<AutomergeTestSpec>): Promise<AgentRunOptions<AutomergeAgentConfig>[]> {
    return range(spec.agents).map((agentIdx) => {
      const type = agentIdx % 2 === 0 ? 'server' : 'client';
      return {
        config: {
          agentIdx,
          type,
          port: type === 'server' ? 12340 + agentIdx : undefined,
        },
        runtime: { platform: type === 'server' ? 'nodejs' : spec.platform },
      };
    });
  }

  repo!: Repo;

  async run(env: AgentEnv<AutomergeTestSpec, AutomergeAgentConfig>): Promise<void> {
    await this._init(env, { network: true });
    const { config, spec } = env.params;

    performance.mark('create:begin');
    const docsToCreate = spec.symmetric || config.type === 'server' ? spec.docCount : 0;
    const localDocs = range(docsToCreate).map((idx) => {
      const handle = this.repo.create();
      handle.change((doc: any) => {
        doc.author = `agent-${config.agentIdx}`;
        doc.idx = idx;
      });

      for (const i of range(spec.changeCount)) {
        switch (spec.contentKind) {
          case 'strings':
            handle.change((doc: any) => {
              doc[`key-${i}`] = `value-${i}`;
            });
            break;
          case 'seq-numbers':
            handle.change((doc: any) => {
              doc.numbers ??= [];
              doc.numbers.push(i);
            });
            break;
        }
      }

      return handle;
    });
    performance.mark('create:end');
    log.info('docs created', {
      count: localDocs.length,
      time: performance.measure('create', 'create:begin', 'create:end').duration,
    });

    const docUrls = (
      await env.syncData(
        'doc-created',
        localDocs.map((doc) => doc.url),
      )
    ).flat();
    log.info('docs shared', { count: docUrls.length });

    performance.mark('ready:begin');
    const docs = docUrls.map((url) => this.repo.find(url));
    await Promise.all(docs.map((doc) => doc.doc()));
    performance.mark('ready:end');
    log.info('docs ready', {
      from: config.type,
      count: docs.length,
      time: performance.measure('ready', 'ready:begin', 'ready:end').duration,
    });
    await this._storageCtx.dispose();
    this._storageCtx = new Context();

    await sleep(1_000);
    await env.syncBarrier('docs ready');

    if (spec.reloadStep && config.type === 'client') {
      await this._init(env, { network: false });

      performance.mark('load:begin');
      const docs = docUrls.map((url) => this.repo.find(url));
      await Promise.all(docs.map((doc) => doc.doc()));
      performance.mark('load:end');
      log.info('docs ready after reload', {
        from: config.type,
        storageType: spec.clientStorage,
        count: docs.length,
        time: performance.measure('load', 'load:begin', 'load:end').duration,
      });
    }

    await env.syncBarrier('done');
  }

  async finish(params: TestParams<AutomergeTestSpec>, results: PlanResults): Promise<any> {}

  private async _init(
    env: AgentEnv<AutomergeTestSpec, AutomergeAgentConfig>,
    { network }: { network: boolean },
  ): Promise<void> {
    const { config, spec, agents, runtime } = env.params;

    const {
      BrowserWebSocketClientAdapter,
      NodeWSServerAdapter,
    }: // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    typeof import('@automerge/automerge-repo-network-websocket') =
      runtime.platform === 'nodejs'
        ? await importEsm('@automerge/automerge-repo-network-websocket')
        : await import('@automerge/automerge-repo-network-websocket');

    switch (config.type) {
      case 'server':
        this.repo = new Repo({
          network: network ? [new NodeWSServerAdapter(new Server({ port: config.port }))] : [],
        });
        break;
      case 'client':
        this.repo = new Repo({
          storage: this._createStorage(spec.clientStorage),
          network: network
            ? randomArraySlice(
                Object.values(agents).filter((a) => a.config.type === 'server'),
                spec.clientConnections,
              ).map((a) => new BrowserWebSocketClientAdapter(`ws://localhost:${a.config.port}`))
            : [],
        });
        break;
    }
  }

  private _storageCtx = new Context();

  private _createStorage(kind: AutomergeTestSpec['clientStorage']) {
    switch (kind) {
      case 'none':
        return undefined;
      case 'idb':
        return new MeteredStorageProxy(new IndexedDBStorageAdapter());
      case 'opfs': {
        const storage = createStorage({ type: StorageType.WEBFS });
        this._storageCtx.onDispose(() => storage.close());
        return new MeteredStorageProxy(new AutomergeStorageAdapter(storage.createDirectory('automerge')));
      }
    }
  }
}

// eslint-disable-next-line no-new-func
const importEsm = Function('path', 'return import(path)');

@trace.resource()
class MeteredStorageProxy extends StorageAdapter {
  constructor(private readonly _storage: StorageAdapter) {
    super();
  }

  @trace.info()
  private get _driverName() {
    return Object.getPrototypeOf(this._storage).constructor.name;
  }

  @trace.metricsCounter()
  _loadMetrics = new SpanTimeDistributionCounter();

  @trace.span({ metricsCounter: '_loadMetrics' })
  override load(key: StorageKey): Promise<Uint8Array | undefined> {
    return this._storage.load(key);
  }

  @trace.metricsCounter()
  _saveMetrics = new SpanTimeDistributionCounter();

  @trace.span({ metricsCounter: '_saveMetrics' })
  override save(key: StorageKey, data: Uint8Array): Promise<void> {
    return this._storage.save(key, data);
  }

  @trace.metricsCounter()
  _removeMetrics = new SpanTimeDistributionCounter();

  @trace.span({ metricsCounter: '_removeMetrics' })
  override remove(key: StorageKey): Promise<void> {
    return this._storage.remove(key);
  }

  @trace.metricsCounter()
  _loadRangeMetrics = new SpanTimeDistributionCounter();

  @trace.span({ metricsCounter: '_loadRangeMetrics' })
  override loadRange(keyPrefix: StorageKey): Promise<Chunk[]> {
    return this._storage.loadRange(keyPrefix);
  }

  @trace.metricsCounter()
  _removeRangeMetrics = new SpanTimeDistributionCounter();

  @trace.span({ metricsCounter: '_removeRangeMetrics' })
  override removeRange(keyPrefix: StorageKey): Promise<void> {
    return this._storage.removeRange(keyPrefix);
  }
}

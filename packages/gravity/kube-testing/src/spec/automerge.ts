//
// Copyright 2023 DXOS.org
//

import { Server } from 'isomorphic-ws';

import { Repo } from '@dxos/automerge/automerge-repo';
import { log } from '@dxos/log';
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

  /**
   * Both server and client create docs.
   */
  symetric: boolean;
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
      platform: 'nodejs',
      clientConnections: 1,
      symetric: false,
      agents: 2,
      docCount: 1,
      changeCount: 100,
      contentKind: 'seq-numbers',
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
        runtime: { platform: spec.platform },
      };
    });
  }

  repo!: Repo;

  async run(env: AgentEnv<AutomergeTestSpec, AutomergeAgentConfig>): Promise<void> {
    await this._init(env);
    const { config, spec } = env.params;

    performance.mark('create:begin');
    const docsToCreate = spec.symetric || config.type === 'server' ? spec.docCount : 0;
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
    await Promise.all(docs.map((doc) => doc.whenReady()));
    performance.mark('ready:end');
    log.info('docs ready', {
      count: docs.length,
      time: performance.measure('ready', 'ready:begin', 'ready:end').duration,
    });

    await env.syncBarrier('done');
  }

  async finish(params: TestParams<AutomergeTestSpec>, results: PlanResults): Promise<any> {}

  private async _init(env: AgentEnv<AutomergeTestSpec, AutomergeAgentConfig>): Promise<void> {
    const { config, spec, agents } = env.params;

    const {
      BrowserWebSocketClientAdapter,
      NodeWSServerAdapter,
    }: // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    typeof import('@automerge/automerge-repo-network-websocket') = await importEsm(
      '@automerge/automerge-repo-network-websocket',
    );

    switch (config.type) {
      case 'server':
        this.repo = new Repo({
          network: [new NodeWSServerAdapter(new Server({ port: config.port }))],
        });
        break;
      case 'client':
        this.repo = new Repo({
          network: randomArraySlice(
            Object.values(agents).filter((a) => a.config.type === 'server'),
            spec.clientConnections,
          ).map((a) => new BrowserWebSocketClientAdapter(`ws://localhost:${a.config.port}`)),
        });
        break;
    }
  }
}

// eslint-disable-next-line no-new-func
const importEsm = Function('path', 'return import(path)');

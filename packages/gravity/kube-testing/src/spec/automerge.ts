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
      agents: 2,
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

  async run(env: AgentEnv<AutomergeTestSpec, AutomergeAgentConfig>): Promise<void> {
    const { config, spec, agents } = env.params;

    const {
      BrowserWebSocketClientAdapter,
      NodeWSServerAdapter,
    }: typeof import('@automerge/automerge-repo-network-websocket') = await importEsm(
      '@automerge/automerge-repo-network-websocket',
    );
    let repo: Repo;

    switch (config.type) {
      case 'server':
        repo = new Repo({
          network: [new NodeWSServerAdapter(new Server({ port: config.port }))],
        });
        break;
      case 'client':
        repo = new Repo({
          network: randomArraySlice(
            Object.values(agents).filter((a) => a.config.type === 'server'),
            spec.clientConnections,
          ).map((a) => new BrowserWebSocketClientAdapter(`ws://localhost:${a.config.port}`)),
        });
        break;
    }

    const handle = repo.create();
    handle.change((doc: any) => {
      doc.author = `agent-${config.agentIdx}`;
    });
    const docUrls = (await env.syncData('doc-created', [handle.url])).flat();
    log.info('shared docs', { docUrls });

    const docs = docUrls.map((url) => repo.find(url));
    await Promise.all(docs.map((doc) => doc.whenReady()));

    log.info('docs ready', { count: docs.length });
    console.log(docs.map((doc) => doc.docSync()));
  }

  async finish(params: TestParams<AutomergeTestSpec>, results: PlanResults): Promise<any> {}
}

const importEsm = Function('path', 'return import(path)');

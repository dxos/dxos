//
// Copyright 2023 DXOS.org
//

import { getReader } from './stats';
import { type PlanResults } from '../plan';

export const RESOURCE_USAGE_LOG = 'dxos.gravity.resource-usage';

export type ResourceUsageLogEntry = {
  ts: number;
  cpu: NodeJS.CpuUsage;
  memory: NodeJS.MemoryUsage;
};

export type ResourceUsageStats = {
  [agentId: string]: {
    ts: number;
    duration: number;

    cpuSystem: number;
    cpuUser: number;
    cpuTotal: number;
    rss: number;
  }[];
};

export const analyzeResourceUsage = async (results: PlanResults): Promise<ResourceUsageStats> => {
  const reader = getReader(results);

  const stats: ResourceUsageStats = {};
  const lastProbeTs: Record<string, number> = {};

  for (const log of reader) {
    if (log.message === RESOURCE_USAGE_LOG) {
      const context = log.context as ResourceUsageLogEntry & { agentId: string };

      if (lastProbeTs[context.agentId] !== undefined) {
        stats[context.agentId] ??= [];
        const duration = context.ts - lastProbeTs[context.agentId];
        stats[context.agentId].push({
          ts: context.ts,
          duration,
          cpuSystem: context.cpu.system / duration / 1000,
          cpuUser: context.cpu.user / duration / 1000,
          cpuTotal: (context.cpu.system + context.cpu.user) / duration / 1000,
          rss: context.memory.rss,
        });
      }

      lastProbeTs[context.agentId] = context.ts;
    }
  }

  return stats;
};

//
// Copyright 2023 DXOS.org
//

import { getReader } from './stats';
import { type ReplicantsSummary } from '../plan';

export const RESOURCE_USAGE_LOG = 'dxos.blade-runner.resource-usage';

export type ResourceUsageLogEntry = {
  ts: number;
  cpu: NodeJS.CpuUsage;
  memory: NodeJS.MemoryUsage;
};

export type ResourceUsageStats = {
  [replicantId: string]: {
    ts: number;
    duration: number;

    cpuSystem: number;
    cpuUser: number;
    cpuTotal: number;
    rss: number;
  }[];
};

export const analyzeResourceUsage = async (results: ReplicantsSummary): Promise<ResourceUsageStats> => {
  const reader = getReader(results);

  const stats: ResourceUsageStats = {};
  const lastProbeTs: Record<string, number> = {};

  for (const log of reader) {
    if (log.message === RESOURCE_USAGE_LOG) {
      const context = log.context as ResourceUsageLogEntry & { replicantId: string };

      if (lastProbeTs[context.replicantId] !== undefined) {
        stats[context.replicantId] ??= [];
        const duration = context.ts - lastProbeTs[context.replicantId];
        stats[context.replicantId].push({
          ts: context.ts,
          duration,
          cpuSystem: context.cpu.system / duration / 1000,
          cpuUser: context.cpu.user / duration / 1000,
          cpuTotal: (context.cpu.system + context.cpu.user) / duration / 1000,
          rss: context.memory.rss,
        });
      }

      lastProbeTs[context.replicantId] = context.ts;
    }
  }

  return stats;
};

//
// Copyright 2022 DXOS.org
//

import { type ExecutorContext, logger, runExecutor } from '@nx/devkit';
import assert from 'node:assert';

export interface ServeWithVaultExecutorOptions {
  serveProject: string;
  serveTarget: string;
  watch?: boolean;
}

// Based on https://nx.dev/recipes/executors/creating-custom-executors#using-node-child-process
export default async function* (
  options: ServeWithVaultExecutorOptions,
  context: ExecutorContext,
): AsyncGenerator<{ success: boolean; baseUrl?: string; vaultBaseUrl?: string }> {
  const { serveProject: project = context.projectName, serveTarget: target, watch } = options;
  assert(project, 'serveProject is required');
  logger.info(`Serving ${target} with vault...`);
  if (context.isVerbose) {
    logger.info(`Options: ${JSON.stringify(options, null, 2)}`);
  }

  const [vaultExecutor, projectExecutor] = await Promise.all([
    runExecutor<{ success: boolean; baseUrl?: string }>({ project: 'vault', target }, { watch }, context),
    runExecutor<{ success: boolean; baseUrl?: string }>({ project, target }, { watch }, context),
  ]);
  const [vaultResult, projectResult] = await Promise.all([vaultExecutor.next(), projectExecutor.next()]);

  // Only yield vault result if it was unsuccessful.
  if (!vaultResult.value.success) {
    yield vaultResult.value;
  }

  yield { ...projectResult.value, vaultBaseUrl: vaultResult.value.baseUrl };

  // This Promise intentionally never resolves, leaving the process running
  await new Promise<{ success: boolean }>(() => {});
}

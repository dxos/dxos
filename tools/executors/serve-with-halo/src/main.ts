//
// Copyright 2022 DXOS.org
//

import { ExecutorContext, logger, runExecutor } from '@nrwl/devkit';
import assert from 'node:assert';

export interface ServeWithHaloExecutorOptions {
  serveProject: string;
  serveTarget: string;
  watch?: boolean;
}

// Based on https://nx.dev/recipes/executors/creating-custom-executors#using-node-child-process
export default async function* (
  options: ServeWithHaloExecutorOptions,
  context: ExecutorContext
): AsyncGenerator<{ success: boolean; baseUrl?: string; haloBaseUrl?: string }> {
  const { serveProject: project = context.projectName, serveTarget: target, watch } = options;
  assert(project, 'serveProject is required');
  logger.info(`Serving ${target} with HALO...`);
  if (context.isVerbose) {
    logger.info(`Options: ${JSON.stringify(options, null, 2)}`);
  }

  const [haloExecutor, projectExecutor] = await Promise.all([
    runExecutor<{ success: boolean; baseUrl?: string }>({ project: 'halo-app', target }, { watch }, context),
    runExecutor<{ success: boolean; baseUrl?: string }>({ project, target }, { watch }, context)
  ]);
  const [haloResult, projectResult] = await Promise.all([haloExecutor.next(), projectExecutor.next()]);

  // Only yield HALO result if it was unsuccessful.
  if (!haloResult.value.success) {
    yield haloResult.value;
  }

  yield { ...projectResult.value, haloBaseUrl: haloResult.value.baseUrl };

  // This Promise intentionally never resolves, leaving the process running
  await new Promise<{ success: boolean }>(() => {});
}

//
// Copyright 2025 DXOS.org
//
import { Bundler } from '@dxos/functions/bundler';

export const bundleScript = async (source: string): Promise<{ bundle?: string; error?: Error }> => {
  const bundler = new Bundler({ platform: 'node', sandboxedModules: [], remoteModules: {} });
  const buildResult = await bundler.bundle({ source });

  if (buildResult.error || !buildResult.bundle) {
    return { error: buildResult.error || new Error('Bundle creation failed') };
  }

  return { bundle: buildResult.bundle };
};

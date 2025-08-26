//
// Copyright 2025 DXOS.org
//

import { type Client } from '@dxos/client';
import { Obj, Ref } from '@dxos/echo';
import {
  FunctionType,
  type ScriptType,
  getUserFunctionIdInMetadata,
  setUserFunctionIdInMetadata,
} from '@dxos/functions';
import { Bundler } from '@dxos/functions/bundler';
import { incrementSemverPatch, uploadWorkerFunction } from '@dxos/functions/edge';
import { log } from '@dxos/log';
import { type Space } from '@dxos/react-client/echo';

import { updateFunctionMetadata } from './functions';

export const isScriptDeployed = ({ script, fn }: { script: ScriptType; fn: any }): boolean => {
  const existingFunctionId = fn && getUserFunctionIdInMetadata(Obj.getMeta(fn));
  return Boolean(existingFunctionId) && !script.changed;
};

type DeployScriptProps = {
  script: ScriptType;
  client: Client;
  space: Space;
  fn?: FunctionType;
  existingFunctionId?: string;
};

type DeployScriptResult = { success: boolean; error?: Error; functionId?: string };

/**
 * Deploy a script to a space, handling bundling and uploading to the FaaS infrastructure.
 */
export const deployScript = async ({
  script,
  client,
  space,
  fn,
  existingFunctionId,
}: DeployScriptProps): Promise<DeployScriptResult> => {
  const validationError = validateDeployInputs(script, space);
  if (validationError) {
    return { success: false, error: validationError };
  }

  try {
    const { bundle, error } = await bundleScript(script.source!.target!.content);
    if (error || !bundle) {
      throw error || new Error('Bundle creation failed');
    }

    const { functionId, version, meta } = await uploadWorkerFunction({
      client,
      ownerPublicKey: space.key,
      version: fn ? incrementSemverPatch(fn.version) : '0.0.1',
      functionId: existingFunctionId,
      source: bundle,
    });

    if (functionId === undefined || version === undefined) {
      throw new Error(`Upload didn't return expected data: ${JSON.stringify({ functionId, version })}`);
    }

    const storedFunction = createOrUpdateFunctionInSpace(space, fn, script, functionId, version);
    script.changed = false;
    updateFunctionMetadata(script, storedFunction, meta, functionId);

    setUserFunctionIdInMetadata(Obj.getMeta(storedFunction), functionId);

    return { success: true, functionId };
  } catch (err: any) {
    log.catch(err);
    return { success: false, error: err };
  }
};

/**
 * Validate inputs for script deployment.
 */
const validateDeployInputs = (script: ScriptType, space: Space): Error | null => {
  if (!script.source || !space) {
    return new Error('Script source or space not available');
  }
  return null;
};

const bundleScript = async (source: string): Promise<{ bundle?: string; error?: Error }> => {
  const bundler = new Bundler({ platform: 'browser', sandboxedModules: [], remoteModules: {} });
  const buildResult = await bundler.bundle({ source });

  if (buildResult.error || !buildResult.bundle) {
    return { error: buildResult.error || new Error('Bundle creation failed') };
  }

  return { bundle: buildResult.bundle };
};

const createOrUpdateFunctionInSpace = (
  space: Space,
  fn: FunctionType | undefined,
  script: ScriptType,
  functionId: string,
  version: string,
): FunctionType => {
  if (fn) {
    fn.name = script.name ?? 'New Function';
    fn.version = version;
    return fn;
  } else {
    const fn = Obj.make(FunctionType, { name: script.name ?? 'New Function', version, source: Ref.make(script) });
    space.db.add(fn);
    setUserFunctionIdInMetadata(Obj.getMeta(fn), functionId);
    return fn;
  }
};

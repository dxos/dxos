//
// Copyright 2025 DXOS.org
//

import { type Client } from '@dxos/client';
import { Obj, Ref } from '@dxos/echo';
import {
  FunctionType,
  type ScriptType,
  getUserFunctionUrlInMetadata,
  makeFunctionUrl,
  setUserFunctionUrlInMetadata,
} from '@dxos/functions';
import { Bundler } from '@dxos/functions/bundler';
import { incrementSemverPatch, uploadWorkerFunction } from '@dxos/functions/edge';
import { log } from '@dxos/log';
import { type Space } from '@dxos/react-client/echo';

import { updateFunctionMetadata } from './functions';

export const isScriptDeployed = ({ script, fn }: { script: ScriptType; fn: any }): boolean => {
  const existingFunctionUrl = fn && getUserFunctionUrlInMetadata(Obj.getMeta(fn));
  return Boolean(existingFunctionUrl) && !script.changed;
};

type DeployScriptProps = {
  script: ScriptType;
  client: Client;
  space: Space;
  fn?: FunctionType;
  existingFunctionUrl?: string;
};

type DeployScriptResult = { success: boolean; error?: Error; functionUrl?: string };

/**
 * Deploy a script to a space, handling bundling and uploading to the FaaS infrastructure.
 */
export const deployScript = async ({
  script,
  client,
  space,
  fn,
  existingFunctionUrl,
}: DeployScriptProps): Promise<DeployScriptResult> => {
  const validationError = validateDeployInputs(script, space);
  if (validationError) {
    return { success: false, error: validationError };
  }

  try {
    const existingFunctionId = extractFunctionId(existingFunctionUrl);

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

    const functionUrl = makeFunctionUrl({ functionId });
    setUserFunctionUrlInMetadata(Obj.getMeta(storedFunction), functionUrl);

    return { success: true, functionUrl };
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

const extractFunctionId = (functionUrl?: string): string | undefined => {
  return functionUrl?.split('/').at(-1);
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
    fn.version = version;
    return fn;
  } else {
    return space.db.add(Obj.make(FunctionType, { name: functionId, version, source: Ref.make(script) }));
  }
};

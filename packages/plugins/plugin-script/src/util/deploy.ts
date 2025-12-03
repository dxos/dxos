//
// Copyright 2025 DXOS.org
//

import { type Client } from '@dxos/client';
import { Obj, Ref } from '@dxos/echo';
import { Function, type Script, getUserFunctionIdInMetadata } from '@dxos/functions';
import { bundleFunction } from '@dxos/functions-runtime/bundler';
import { FunctionsServiceClient, incrementSemverPatch } from '@dxos/functions-runtime/edge';
import { log } from '@dxos/log';
import { Runtime } from '@dxos/protocols';
import { type Space } from '@dxos/react-client/echo';

export const isScriptDeployed = ({ script, fn }: { script: Script.Script; fn: any }): boolean => {
  const existingFunctionId = fn && getUserFunctionIdInMetadata(Obj.getMeta(fn));
  return Boolean(existingFunctionId) && !script.changed;
};

type DeployScriptProps = {
  script: Script.Script;
  client: Client;
  space: Space;
  fn?: Function.Function;
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
    const buildResult = await bundleFunction({
      source: script.source!.target!.content,
    });
    if ('error' in buildResult) {
      throw buildResult.error || new Error('Bundle creation failed');
    }

    const functionsServiceClient = FunctionsServiceClient.fromClient(client);
    const newFunction = await functionsServiceClient.deploy({
      // TODO(dmaretskyi): Space key or identity key.
      ownerPublicKey: space.key,
      version: fn ? incrementSemverPatch(fn.version) : '0.0.1',
      functionId: existingFunctionId,
      entryPoint: buildResult.entryPoint,
      assets: buildResult.assets,
      runtime: Runtime.WORKER_LOADER,
    });

    const storedFunction = createOrUpdateFunctionInSpace(space, fn, script, newFunction);
    script.changed = false;

    return { success: true, functionId: getUserFunctionIdInMetadata(Obj.getMeta(storedFunction)) };
  } catch (err: any) {
    log.catch(err);
    return { success: false, error: err };
  }
};

/**
 * Validate inputs for script deployment.
 */
const validateDeployInputs = (script: Script.Script, space: Space): Error | null => {
  if (!script.source || !space) {
    return new Error('Script source or space not available');
  }
  return null;
};

const createOrUpdateFunctionInSpace = (
  space: Space,
  fn: Function.Function | undefined,
  script: Script.Script,
  newFunction: Function.Function,
): Function.Function => {
  if (fn) {
    Function.setFrom(fn, newFunction);
    return fn;
  } else {
    newFunction.source = Ref.make(script);
    return space.db.add(newFunction);
  }
};

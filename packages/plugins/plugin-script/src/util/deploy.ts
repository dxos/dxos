//
// Copyright 2025 DXOS.org
//

import { type Client } from '@dxos/client';
import { getUserFunctionIdInMetadata } from '@dxos/compute-runtime';
import * as Operation from '@dxos/compute/Operation';
import * as Script from '@dxos/compute/Script';
import { Context } from '@dxos/context';
import { type Database, Obj, Ref } from '@dxos/echo';
import { FunctionsServiceClient, incrementSemverPatch } from '@dxos/edge-compute';
import { bundleFunction } from '@dxos/edge-compute/bundler';
import { log } from '@dxos/log';
import { FunctionRuntimeKind } from '@dxos/protocols';

export const isScriptDeployed = ({ script, fn }: { script: Script.Script; fn: any }): boolean => {
  const existingFunctionId = fn && getUserFunctionIdInMetadata(Obj.getMeta(fn));
  return Boolean(existingFunctionId) && !script.changed;
};

type DeployScriptProps = {
  script: Script.Script;
  client: Client;
  db: Database.Database;
  fn?: Operation.PersistentOperation;
  existingFunctionId?: string;
};

type DeployScriptResult = { success: boolean; error?: Error; functionId?: string };

/**
 * Deploy a script to a space, handling bundling and uploading to the FaaS infrastructure.
 */
export const deployScript = async ({
  script,
  client,
  db,
  fn,
  existingFunctionId,
}: DeployScriptProps): Promise<DeployScriptResult> => {
  const validationError = validateDeployInputs(script, db);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const identity = client.halo.identity.get();
  if (!identity) {
    return { success: false, error: new Error('Identity not available.') };
  }

  try {
    const buildResult = await bundleFunction({
      source: script.source!.target!.content,
    });
    if ('error' in buildResult) {
      throw buildResult.error || new Error('Bundle creation failed');
    }

    const functionsServiceClient = FunctionsServiceClient.fromClient(client);
    const newFunction = await functionsServiceClient.deploy(Context.default(), {
      ownerUri: identity.did,
      version: fn ? incrementSemverPatch(Obj.getMeta(fn).version ?? '0.0.0') : '0.0.1',
      functionId: existingFunctionId,
      entryPoint: buildResult.entryPoint,
      assets: buildResult.assets,
      runtime: FunctionRuntimeKind.enums.WORKER_LOADER,
    });

    const storedFunction = createOrUpdateFunction(db, fn, script, newFunction);
    Obj.update(script, (script) => {
      script.changed = false;
    });

    return { success: true, functionId: getUserFunctionIdInMetadata(Obj.getMeta(storedFunction)) };
  } catch (err: any) {
    log.catch(err);
    return { success: false, error: err };
  }
};

/**
 * Validate inputs for script deployment.
 */
const validateDeployInputs = (script: Script.Script, db: Database.Database): Error | null => {
  if (!script.source || !db) {
    return new Error('Script source or database not available');
  }
  return null;
};

const createOrUpdateFunction = (
  db: Database.Database,
  fn: Operation.PersistentOperation | undefined,
  script: Script.Script,
  newFunction: Operation.PersistentOperation,
): Operation.PersistentOperation => {
  if (fn) {
    Operation.setFrom(fn, newFunction);
    return fn;
  } else {
    Obj.update(newFunction, (newFunction) => {
      newFunction.source = Ref.make(script);
    });
    return db.add(newFunction);
  }
};

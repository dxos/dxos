//
// Copyright 2025 DXOS.org
//

import {
  FunctionType,
  type ScriptType,
  getInvocationUrl,
  getUserFunctionUrlInMetadata,
  incrementSemverPatch,
  setUserFunctionUrlInMetadata,
  uploadWorkerFunction,
} from '@dxos/functions';
import { Bundler } from '@dxos/functions/bundler';
import { log } from '@dxos/log';
import { create, getMeta, getSpace, makeRef } from '@dxos/react-client/echo';

/**
 * Get the function URL for a given script and client configuration
 */
export const getFunctionUrl = ({
  script,
  fn,
  edgeUrl,
}: {
  script: ScriptType;
  fn: any;
  edgeUrl: string;
}): string | undefined => {
  const space = getSpace(script);
  const existingFunctionUrl = fn && getUserFunctionUrlInMetadata(getMeta(fn));

  if (!existingFunctionUrl) {
    return undefined;
  }

  return getInvocationUrl(existingFunctionUrl, edgeUrl, {
    spaceId: space?.id,
  });
};

/**
 * Check if a script is deployed
 */
export const isScriptDeployed = ({ script, fn }: { script: ScriptType; fn: any }): boolean => {
  const existingFunctionUrl = fn && getUserFunctionUrlInMetadata(getMeta(fn));
  return Boolean(existingFunctionUrl) && !script.changed;
};

/**
 * Core deployment function that handles bundling and uploading a script
 */
export const deployScript = async ({
  script,
  client,
  space,
  fn,
  existingFunctionUrl,
}: {
  script: ScriptType;
  client: any;
  space: any;
  fn: any;
  existingFunctionUrl?: string;
}): Promise<{ success: boolean; error?: Error; functionUrl?: string }> => {
  if (!script.source || !space) {
    return { success: false, error: new Error('Script source or space not available') };
  }

  try {
    const existingFunctionId = existingFunctionUrl?.split('/').at(-1);

    const bundler = new Bundler({ platform: 'browser', sandboxedModules: [], remoteModules: {} });
    const buildResult = await bundler.bundle({ source: script.source.target!.content });
    if (buildResult.error || !buildResult.bundle) {
      throw buildResult.error || new Error('Bundle creation failed');
    }

    const { functionId, version, meta } = await uploadWorkerFunction({
      client,
      spaceId: space.id,
      version: fn ? incrementSemverPatch(fn.version) : '0.0.1',
      functionId: existingFunctionId,
      source: buildResult.bundle,
    });

    if (functionId === undefined || version === undefined) {
      throw new Error(`Upload didn't return expected data: ${JSON.stringify({ functionId, version })}`);
    }

    let storedFunction = fn;
    if (storedFunction) {
      storedFunction.version = version;
    } else {
      storedFunction = space.db.add(
        create(FunctionType, {
          name: functionId,
          version,
          source: makeRef(script),
        }),
      );
    }

    script.changed = false;
    updateFunctionMetadata(script, storedFunction, meta, functionId);

    const functionUrl = `/${space.id}/${functionId}`;
    setUserFunctionUrlInMetadata(getMeta(storedFunction), functionUrl);

    return {
      success: true,
      functionUrl,
    };
  } catch (err: any) {
    log.catch(err);
    return { success: false, error: err };
  }
};

/**
 * Helper function to update function metadata
 */
const updateFunctionMetadata = (script: ScriptType, storedFunction: any, meta: any, functionId: string) => {
  if (script.description !== undefined && script.description.trim() !== '') {
    storedFunction.description = script.description;
  } else if (meta.description) {
    storedFunction.description = meta.description;
  } else {
    log.verbose('no description in function metadata', { functionId });
  }

  if (meta.inputSchema) {
    storedFunction.inputSchema = meta.inputSchema;
  } else {
    log.verbose('no input schema in function metadata', { functionId });
  }

  if (meta.outputSchema) {
    storedFunction.outputSchema = meta.outputSchema;
  } else {
    log.verbose('no output schema in function metadata', { functionId });
  }
};

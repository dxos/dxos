//
// Copyright 2025 DXOS.org
//

import { type ScriptType, getInvocationUrl, getUserFunctionUrlInMetadata } from '@dxos/functions';
import { log } from '@dxos/log';
import { getMeta, getSpace } from '@dxos/react-client/echo';

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

export const updateFunctionMetadata = (script: ScriptType, storedFunction: any, meta: any, functionId: string) => {
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

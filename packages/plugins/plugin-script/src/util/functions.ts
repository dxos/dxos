//
// Copyright 2025 DXOS.org
//

import { type Function, type Script, getInvocationUrl, getUserFunctionIdInMetadata } from '@dxos/functions';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { getMeta, getSpace } from '@dxos/react-client/echo';
/**
 * Get the function URL for a given script and client configuration
 */
export const getFunctionUrl = ({
  script,
  fn,
  edgeUrl,
}: {
  script: Script.Script;
  fn: any;
  edgeUrl: string;
}): string | undefined => {
  const space = getSpace(script);
  const existingFunctionId = fn && getUserFunctionIdInMetadata(getMeta(fn));

  if (!existingFunctionId) {
    return undefined;
  }

  return getInvocationUrl(existingFunctionId, edgeUrl, {
    spaceId: space?.id,
  });
};

export const updateFunctionMetadata = (
  script: Script.Script,
  storedFunction: Function.Function,
  meta: any,
  functionId: string,
) => {
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

  if (meta.key) {
    storedFunction.key = meta.key;
  } else {
    log.verbose('no key in function metadata', { functionId });
  }
};

export const getAccessCredential = (identityKey: PublicKey): Credential => {
  return {
    issuer: identityKey,
    issuanceDate: new Date(),
    subject: {
      id: identityKey,
      assertion: {
        '@type': 'dxos.halo.credentials.ServiceAccess',
        serverName: 'hub.dxos.network',
        serverKey: identityKey,
        identityKey,
        capabilities: ['composer:beta'],
      },
    },
  };
};

//
// Copyright 2025 DXOS.org
//

import { Context, Layer } from 'effect';

import type { SpaceId } from '@dxos/keys';

/**
 * Allows calling into other functions.
 */
export class RemoteFunctionExecutionService extends Context.Tag('RemoteFunctionExecutionService')<
  RemoteFunctionExecutionService,
  {
    callFunction(deployedFunctionId: string, input: any, spaceId?: SpaceId): Promise<any>;
  }
>() {
  static fromClient(baseUrl: string, spaceId: SpaceId): Context.Tag.Service<RemoteFunctionExecutionService> {
    return {
      callFunction: async (deployedFunctionId: string, input: any) => {
        const url = getInvocationUrl(deployedFunctionId, baseUrl, { spaceId });
        const result = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        if (result.status >= 300 || result.status < 200) {
          throw new Error('Failed to invoke function', { cause: new Error(`HTTP error: ${await result.text()}`) });
        }
        return await result.json();
      },
    };
  }

  static mock = (): Context.Tag.Service<RemoteFunctionExecutionService> => {
    return {
      callFunction: async (deployedFunctionId: string, input: any) => {
        return input;
      },
    };
  };

  static mockLayer = Layer.succeed(RemoteFunctionExecutionService, RemoteFunctionExecutionService.mock());
}

// TODO(dmaretskyi): Reconcile with `getInvocationUrl` in `@dxos/functions/edge`.
const getInvocationUrl = (functionUrl: string, edgeUrl: string, options: InvocationOptions = {}) => {
  const baseUrl = new URL('functions/', edgeUrl);

  // Leading slashes cause the URL to be treated as an absolute path.
  const relativeUrl = functionUrl.replace(/^\//, '');
  const url = new URL(`./${relativeUrl}`, baseUrl.toString());
  options.spaceId && url.searchParams.set('spaceId', options.spaceId);
  options.subjectId && url.searchParams.set('subjectId', options.subjectId);
  url.protocol = isSecure(url.protocol) ? 'https' : 'http';
  return url.toString();
};

const isSecure = (protocol: string) => {
  return protocol === 'https:' || protocol === 'wss:';
};

type InvocationOptions = {
  spaceId?: SpaceId;
  subjectId?: string;
};

//
// Copyright 2025 DXOS.org
//

import { Context, Layer } from 'effect';

import type { SpaceId } from '@dxos/keys';

import { getInvocationUrl } from '../url';

/**
 * Allows calling into other functions.
 */
export class RemoteFunctionExecutionService extends Context.Tag('@dxos/functions/RemoteFunctionExecutionService')<
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

  static layerMock = Layer.succeed(RemoteFunctionExecutionService, RemoteFunctionExecutionService.mock());
}

//
// Copyright 2025 DXOS.org
//

import { Context } from 'effect';

import { getInvocationUrl } from '@dxos/functions/edge';
import type { SpaceId } from '@dxos/keys';

export class FunctionCallService extends Context.Tag('FunctionCallService')<
  FunctionCallService,
  {
    callFunction(deployedFunctionId: string, input: any, spaceId?: SpaceId): Promise<any>;
  }
>() {
  static fromClient(baseUrl: string, spaceId: SpaceId): Context.Tag.Service<FunctionCallService> {
    return {
      callFunction: async (deployedFunctionId: string, input: any) => {
        const url = getInvocationUrl(deployedFunctionId, baseUrl, { spaceId });

        const result = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        if (result.status >= 300 || result.status < 200) {
          throw new Error(`Failed to invoke function: ${await result.text()}`);
        }
        return await result.json();
      },
    };
  }

  static mock = () => {
    return {
      callFunction: async (deployedFunctionId: string, input: any) => {
        return input;
      },
    };
  };
}

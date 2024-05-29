//
// Copyright 2024 DXOS.org
//

import { RunnablePassthrough, type RunnableSequence } from '@langchain/core/runnables';

import { type ModelInvocationArgs, type ModelInvoker } from '../chain/model-invoker';

type CallArguments = Omit<ModelInvocationArgs, 'space'>;
export class StubModelInvoker implements ModelInvoker {
  calls: CallArguments[] = [];
  nextCallResult: any = null;

  get lastCallArguments(): CallArguments | null {
    return this.calls[this.calls.length - 1] ?? null;
  }

  public async invoke(args: ModelInvocationArgs): Promise<RunnableSequence> {
    const callArgs = { ...args };
    delete (callArgs as any).space;
    for (const [key, value] of Object.entries(callArgs.templateSubstitutions)) {
      if (value instanceof RunnablePassthrough) {
        callArgs.templateSubstitutions[key] = callArgs.sequenceInput;
      } else if (typeof value === 'function') {
        callArgs.templateSubstitutions[key] = value();
      }
    }
    this.calls.push(callArgs);
    return this.nextCallResult ?? 'Default response';
  }
}

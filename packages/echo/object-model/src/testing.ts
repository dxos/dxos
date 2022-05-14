//
// Copyright 2020 DXOS.org
//

import { PublicKey } from '@dxos/crypto';
import { FeedKey } from '@dxos/echo-protocol';
import { MutationWriter } from '@dxos/model-factory';
import { ObjectModel } from './object-model';

/**
 * Creates a testable model that performs mutation updates.
 */
export const createTestObjectModel = (itemId = 'test') => {
  const key = PublicKey.random();
  const stateMachine = ObjectModel.meta.stateMachine();

  let seq = 0;
  const mutationWriter: MutationWriter<any> = async (mutation: any) => {
    return {
      feedKey: PublicKey.random() as FeedKey,
      seq: seq++,
      waitToBeProcessed: async () => {
        stateMachine.process(mutation, {
          author: key
        });
      }
    }
  }

  return new ObjectModel(ObjectModel.meta, itemId, () => stateMachine.getState(), mutationWriter);
};

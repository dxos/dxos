//
// Copyright 2020 DXOS.org
//

import { PublicKey } from '@dxos/crypto';
import { FeedKey, ItemID } from '@dxos/echo-protocol';
import { MutationWriter } from '@dxos/model-factory';

import { ObjectModel } from './object-model';
import { ObjectMutationSet } from './proto';

/**
 * Creates a testable model that performs mutation updates.
 */
// TODO(burdon): Move to model-factory.
export const createTestObjectModel = (key = PublicKey.random(), itemId: ItemID = 'test') => {
  const debug = {
    seq: 0
  };

  const stateMachine = ObjectModel.meta.stateMachine();
  const mutationWriter: MutationWriter<ObjectMutationSet> = async (mutation: ObjectMutationSet) => {
    return {
      feedKey: PublicKey.random() as FeedKey,
      seq: debug.seq++,
      waitToBeProcessed: async () => {
        stateMachine.process(mutation, {
          author: key
        });
      }
    };
  };

  return {
    model: new ObjectModel(ObjectModel.meta, itemId, () => stateMachine.getState(), mutationWriter),
    debug
  };
};

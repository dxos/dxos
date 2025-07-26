//
// Copyright 2024 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import { IdentityDid } from '@dxos/keys';
import { faker } from '@dxos/random';
import { type Identity } from '@dxos/react-client/halo';
import { DataType } from '@dxos/schema';

import { ThreadType } from '../types';

export const createCommentThread = (identity: Identity): ThreadType => {
  return Obj.make(ThreadType, {
    messages: faker.helpers.multiple(
      () =>
        Ref.make(
          Obj.make(DataType.Message, {
            created: new Date().toISOString(),
            sender: {
              identityDid: faker.datatype.boolean() ? identity.did : IdentityDid.random(),
            },
            blocks: [{ _tag: 'text', text: faker.lorem.sentences(3) }],
          }),
        ),
      { count: { min: 2, max: 3 } },
    ),
  });
};

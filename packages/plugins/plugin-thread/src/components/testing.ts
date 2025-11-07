//
// Copyright 2024 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import { IdentityDid } from '@dxos/keys';
import { faker } from '@dxos/random';
import { type Identity } from '@dxos/react-client/halo';
import { Message } from '@dxos/types';

import { Thread } from '../types';

export const createCommentThread = (identity: Identity): Thread.Thread => {
  return Thread.make({
    name: 'Comment',
    messages: faker.helpers.multiple(
      () =>
        Ref.make(
          Obj.make(Message.Message, {
            created: new Date().toISOString(),
            sender: {
              identityDid: faker.datatype.boolean() ? identity.did : IdentityDid.random(),
            },
            blocks: [{ _tag: 'text', text: faker.lorem.sentences(3) }],
          }),
        ),
      { count: { min: 2, max: 3 } },
    ),
    status: 'active',
  });
};

export const createProposalThread = (identity: Identity): Thread.Thread => {
  return Thread.make({
    name: 'Proposal',
    messages: faker.helpers.multiple(
      () =>
        Ref.make(
          Obj.make(Message.Message, {
            created: new Date().toISOString(),
            sender: {
              identityDid: faker.datatype.boolean() ? identity.did : IdentityDid.random(),
            },
            blocks: [{ _tag: 'proposal', text: faker.lorem.sentences(3) }],
          }),
        ),
      { count: { min: 1, max: 1 } },
    ),
    status: 'active',
  });
};

//
// Copyright 2024 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import { IdentityDid } from '@dxos/keys';
import { random } from '@dxos/random';
import { type Identity } from '@dxos/react-client/halo';
import { Message, Thread } from '@dxos/types';

export const createCommentThread = (identity: Identity): Thread.Thread => {
  return Thread.make({
    name: 'Comment',
    messages: random.helpers.multiple(
      () =>
        Ref.make(
          Obj.make(Message.Message, {
            created: new Date().toISOString(),
            sender: {
              identityDid: random.datatype.boolean() ? identity.did : IdentityDid.random(),
            },
            blocks: [{ _tag: 'text', text: random.lorem.sentences(3) }],
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
    messages: random.helpers.multiple(
      () =>
        Ref.make(
          Obj.make(Message.Message, {
            created: new Date().toISOString(),
            sender: {
              identityDid: random.datatype.boolean() ? identity.did : IdentityDid.random(),
            },
            blocks: [{ _tag: 'proposal', text: random.lorem.sentences(3) }],
          }),
        ),
      { count: { min: 1, max: 1 } },
    ),
    status: 'active',
  });
};

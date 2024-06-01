//
// Copyright 2024 DXOS.org
//

import type { Client } from '@dxos/client';
import { Filter, type Space } from '@dxos/client/echo';
import { performInvitation } from '@dxos/client/testing';
import { invariant } from '@dxos/invariant';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

import { FunctionTrigger } from '../types';

export const triggerWebhook = async (space: Space, uri: string) => {
  const trigger = (
    await space.db.query(Filter.schema(FunctionTrigger, (t: FunctionTrigger) => t.function === uri)).run()
  ).objects[0];
  invariant(trigger.spec.type === 'webhook');
  void fetch(`http://localhost:${trigger.spec.port}`);
};

export const inviteMember = async (host: Space, guest: Client) => {
  const [{ invitation: hostInvitation }] = await Promise.all(performInvitation({ host, guest: guest.spaces }));
  if (hostInvitation?.state !== Invitation.State.SUCCESS) {
    throw new Error(`Expected ${hostInvitation?.state} to be ${Invitation.State.SUCCESS}.`);
  }
};

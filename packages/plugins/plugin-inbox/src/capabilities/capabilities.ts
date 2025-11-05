//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';
import type { DataType } from '@dxos/schema';

import { meta } from '../meta';

export namespace InboxCapabilities {
  export type MailboxState = {
    // TODO(wittjosiah): This should probably be a record of ids but currently there's no easy way to query a queue for
    //  a single item so this is much lighter weight.
    [key: string]: DataType.Message.Message;
  };
  export const MailboxState = defineCapability<Readonly<MailboxState>>(`${meta.id}/capabilities/mailbox-state`);
  export const MutableMailboxState = defineCapability<MailboxState>(`${meta.id}/capabilities/mailbox-state`);
}

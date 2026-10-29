//
// Copyright 2025 DXOS.org
//

import { DXN } from '@dxos/keys';

import { InboxNamespace } from './namespace.ts';

export const POPOVER_SAVE_FILTER = DXN.make(`${InboxNamespace.key}.saveFilterPopover`);

export const MAILBOXES_SECTION_TYPE = `${InboxNamespace.key}.mailboxes-section`;
export const MAILBOX_SUBSCRIPTIONS_TYPE = `${InboxNamespace.key}.subscriptions`;

/** Disposition of the mailbox-wide jobs (sync, analyze) the mailbox toolbar puts in its : menu. */
export const MAILBOX_MENU_DISPOSITION = `${InboxNamespace.key}.mailbox-menu`;

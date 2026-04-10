//
// Copyright 2025 DXOS.org
//

import { meta } from '#meta';

export const POPOVER_SAVE_FILTER = `${meta.id}.SaveFilterPopover`;

export const MAILBOXES_SECTION_TYPE = `${meta.id}.mailboxes-section`;
export const MAILBOX_ALL_MAIL_TYPE = `${meta.id}.all-mail`;
export const MAILBOX_DRAFTS_TYPE = `${meta.id}.drafts`;

/**
 * Sentinel `data` value for the drafts folder graph node. Must be non-null so the nav tree can select it (`handleSelect` skips `!node.data`).
 */
export const MAILBOX_DRAFTS_NODE_DATA = `${meta.id}.drafts-folder` as const;

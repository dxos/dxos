//
// Copyright 2025 DXOS.org
//

import { Node } from '@dxos/plugin-graph';

/** Well-known local segment names (private — use the path helpers below). */
const Segments = {
  mailboxes: 'mailboxes',
  allMail: 'all-mail',
  drafts: 'drafts',
} as const;

/** Canonical segment ID for the mailboxes section node. */
export const getMailboxesSectionId = (): string => Segments.mailboxes;

/** Canonical qualified path to the mailboxes section of a space. */
export const getMailboxesPath = (spaceId: string): string => `${Node.RootId}/${spaceId}/${Segments.mailboxes}`;

/** Canonical qualified path to a specific mailbox within a space. */
export const getMailboxPath = (spaceId: string, mailboxId: string): string =>
  `${getMailboxesPath(spaceId)}/${mailboxId}`;

/** Canonical segment ID for the all-mail child node. */
export const getAllMailId = (): string => Segments.allMail;

/** Canonical qualified path to a mailbox's all-mail view. */
export const getMailboxAllMailPath = (spaceId: string, mailboxId: string): string =>
  `${getMailboxPath(spaceId, mailboxId)}/${Segments.allMail}`;

/** Canonical segment ID for the drafts child node. */
export const getDraftsId = (): string => Segments.drafts;

/** Canonical qualified path to a mailbox's drafts view. */
export const getMailboxDraftsPath = (spaceId: string, mailboxId: string): string =>
  `${getMailboxPath(spaceId, mailboxId)}/${Segments.drafts}`;

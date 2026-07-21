//
// Copyright 2025 DXOS.org
//

import { Paths } from '@dxos/app-toolkit';
import { linkedSegment } from '@dxos/react-ui-attention/types';

import { Calendar } from '#types';

const { getSectionPath: getCalendarsPath, getObjectPath: getCalendarPath } = Paths.createTypeSectionPaths(
  Calendar.Calendar,
  { groupId: Paths.GroupSegments.communications },
);

/** Well-known local segment names (private — use the path helpers below). */
const Segments = {
  mailboxes: 'mailboxes',
  allMail: 'all-mail',
  sent: 'sent',
  drafts: 'drafts',
  subscriptions: 'subscriptions',
} as const;

/** Canonical segment ID for the mailboxes section node. */
export const getMailboxesSectionId = (): string => Segments.mailboxes;

/** Canonical qualified path to the mailboxes section of a space. */
export const getMailboxesPath = (spaceId: string): string =>
  Paths.getSpacePath(spaceId, Paths.GroupSegments.communications, Segments.mailboxes);

/** Canonical qualified path to a specific mailbox within a space. */
export const getMailboxPath = (spaceId: string, mailboxId: string): string =>
  `${getMailboxesPath(spaceId)}/${mailboxId}`;

/** Canonical segment ID for the "All Mail" (unfiltered) child node. */
export const getAllMailId = (): string => Segments.allMail;

/** Canonical segment ID for the "Sent" child node. */
export const getSentId = (): string => Segments.sent;

/** Canonical segment ID for the drafts child node. */
export const getDraftsId = (): string => Segments.drafts;

/** Canonical segment ID for the subscriptions child node. */
export const getSubscriptionsId = (): string => Segments.subscriptions;

/** Canonical qualified path to a mailbox's drafts view. */
export const getMailboxDraftsPath = (spaceId: string, mailboxId: string): string =>
  `${getMailboxPath(spaceId, mailboxId)}/${Segments.drafts}`;

/**
 * Appends a linked-segment child ID to a parent path for feed-object navigation.
 * The `~` prefix signals attention propagation to the parent node.
 */
export const getFeedObjectPath = (parentPath: string, childId: string): string =>
  `${parentPath}/${linkedSegment(childId)}`;

/** Canonical qualified path to a message within a mailbox. */
export const getMailboxMessagePath = (spaceId: string, mailboxId: string, messageId: string): string =>
  getFeedObjectPath(getMailboxPath(spaceId, mailboxId), messageId);

/** Canonical qualified path to an event within a calendar. */
export const getCalendarEventPath = (spaceId: string, calendarId: string, eventId: string): string =>
  getFeedObjectPath(getCalendarPath(spaceId, calendarId), eventId);

/**
 * Selection context id for a calendar's planning date range. Kept distinct from the calendar's own
 * context id (which holds the `single` event selection) so the two selection modes don't collide.
 * Written by `CalendarArticle` (on range drag) and read by plugin-trip's "Plan trip from calendar".
 */
export const getCalendarRangeSelectionId = (contextId: string): string => `${contextId}/plan-range`;

/**
 * Builds the node ID for an event's companion node by appending the pre-computed linked segment
 * to the calendar's attendable ID. The segment must already be a linked segment (see EventArticle).
 */
export const getEventNodeId = (attendableId: string, eventSegment: string): string => `${attendableId}/${eventSegment}`;

export { getCalendarPath, getCalendarsPath };

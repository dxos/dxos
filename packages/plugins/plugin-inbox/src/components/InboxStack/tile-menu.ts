//
// Copyright 2026 DXOS.org
//

import { type InboxStackAction } from './InboxStack';

/** One entry in a mailbox tile's overflow menu. */
export type TileMenuItem = {
  label: string;
  icon: string;
  onClick: () => void;
};

export type TileMenuOptions = {
  /** The message the entries act on — a conversation tile passes its latest, as its star does. */
  messageId: string;
  /** Sender address; `Ignore sender` is meaningless without one. */
  senderEmail?: string;
  /** Whether the message currently carries the `inbox` tag, which flips Archive to its inverse. */
  inInbox: boolean;
  enableArchive?: boolean;
  enableIgnoreSender?: boolean;
  enableCreateTopic?: boolean;
  onAction?: (action: InboxStackAction) => void;
};

/**
 * The overflow-menu entries shared by both mailbox tiles, so neither can silently omit an entry the
 * other offers.
 */
export const buildTileMenuItems = ({
  messageId,
  senderEmail,
  inInbox,
  enableArchive,
  enableIgnoreSender,
  enableCreateTopic,
  onAction,
}: TileMenuOptions): TileMenuItem[] | undefined => {
  if (!onAction) {
    return undefined;
  }

  const items: TileMenuItem[] = [];
  // Archive is the `inbox` tag coming off, so the same entry restores a message that lacks it.
  if (enableArchive) {
    items.push({
      label: inInbox ? 'Archive' : 'Move to Inbox',
      icon: inInbox ? 'ph--archive--regular' : 'ph--tray--regular',
      onClick: () => onAction({ type: 'archive', messageId }),
    });
  }
  if (enableIgnoreSender && senderEmail) {
    items.push({
      label: 'Ignore sender',
      icon: 'ph--prohibit--regular',
      onClick: () => onAction({ type: 'ignore-sender', messageId }),
    });
  }
  if (enableCreateTopic) {
    items.push({
      label: 'Create Project',
      icon: 'ph--stack--regular',
      onClick: () => onAction({ type: 'create-topic', messageId }),
    });
  }

  return items.length > 0 ? items : undefined;
};

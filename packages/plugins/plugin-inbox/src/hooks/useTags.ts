//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { Obj, Tag } from '@dxos/echo';
import { getHashStyles } from '@dxos/ui-theme';

import { type MessageStackTag } from '#components';
import { Mailbox } from '#types';

import { GoogleMail } from '../apis';

/**
 * Resolve the message's tag uris (from the Mailbox tag index) to Tag objects for label/hue.
 */
export const useMessageTags = (mailboxes: Mailbox.Mailbox[], message: Mailbox.MessageLike, tagObjects: Tag.Tag[]) => {
  const tagByUri = new Map(tagObjects.map((tag) => [Obj.getURI(tag).toString(), tag]));
  const tagUris = mailboxes.flatMap((mailbox) => Mailbox.getTagsForMessage(mailbox, message));
  const tags = [...new Set(tagUris)].flatMap((uri) => {
    const tag = tagByUri.get(uri);
    return tag ? [{ id: uri, label: tag.label, hue: tag.hue }] : [];
  });

  return useGmailTags(tags);
};

/**
 * Map onto Gmail labels.
 */
export const useGmailTags = (tags?: MessageStackTag[]) => {
  return useMemo(
    () =>
      (tags ?? [])
        .filter((tag) => !GoogleMail.isSystemLabel(tag.id) && tag.label)
        .map((tag) => ({ id: tag.id, hue: tag.hue ?? getHashStyles(tag.id).hue, label: tag.label })),
    [tags],
  );
};

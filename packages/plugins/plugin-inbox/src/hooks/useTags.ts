//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { Obj, type Tag } from '@dxos/echo';
import { getHashStyles } from '@dxos/ui-theme';

import { type InboxStackTag } from '#components';
import { Mailbox } from '#types';

/**
 * Resolve the message's tag uris (from the Mailbox tag index) to Tag objects for label/hue.
 */
export const useMessageTags = (
  mailbox: Mailbox.Mailbox | undefined,
  message: Mailbox.MessageLike,
  tagObjects: Tag.Tag[],
) => {
  const tagByUri = new Map(tagObjects.map((tag) => [Obj.getURI(tag).toString(), tag]));
  const tagUris = mailbox ? Mailbox.getTagsForMessage(mailbox, message) : [];
  const tags = [...new Set(tagUris)].flatMap((uri) => {
    const tag = tagByUri.get(uri);
    return tag ? [{ id: uri, label: tag.label, hue: tag.hue }] : [];
  });

  return useVisibleTags(tags);
};

/**
 * Chip-renderable tags: drops unlabelled ones and assigns each a stable hue derived from its uri when
 * the tag carries none. Provider-agnostic — a synced provider label reaches this already resolved to a
 * {@link Tag} object, so nothing here knows Gmail from JMAP.
 */
export const useVisibleTags = (tags?: InboxStackTag[]) => {
  return useMemo(
    () =>
      (tags ?? [])
        .filter((tag) => tag.label)
        .map((tag) => ({ id: tag.id, hue: tag.hue ?? getHashStyles(tag.id).hue, label: tag.label })),
    [tags],
  );
};

//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import { useMemo } from 'react';

import { Obj, type Tag } from '@dxos/echo';
import { useResolveRef } from '@dxos/echo-react';
import { TagIndex } from '@dxos/schema';
import { getHashStyles } from '@dxos/ui-theme';

import { type InboxStackTag } from '#components';
import { type Mailbox } from '#types';

const EMPTY_TAG_URIS_ATOM = Atom.make<string[]>(() => []);

/**
 * Resolve the message's tag uris (from the Mailbox tag index) to Tag objects for label/hue.
 */
export const useMessageTags = (
  mailbox: Mailbox.Mailbox | undefined,
  message: Mailbox.MessageLike,
  tagObjects: Tag.Tag[],
) => {
  // Read reactively: the tag index is its own object, so a tag applied after the `Tag` object is created
  // changes nothing the caller otherwise subscribes to.
  const tagIndex = useResolveRef(mailbox?.tags);
  const tagUrisAtom = useMemo(
    () => (tagIndex ? TagIndex.atom(tagIndex)(message.id) : EMPTY_TAG_URIS_ATOM),
    [tagIndex, message.id],
  );
  const tagUris = useAtomValue(tagUrisAtom);
  const tagByUri = new Map(tagObjects.map((tag) => [Obj.getURI(tag).toString(), tag]));
  const tags = [...new Set(tagUris)].flatMap((uri) => {
    const tag = tagByUri.get(uri);
    return tag ? [{ id: uri, label: tag.label, hue: tag.hue }] : [];
  });

  return useVisibleTags(tags);
};

/**
 * Chip-renderable tags: drops unlabelled ones and assigns each a stable hue derived from its uri when
 * the tag carries none. Provider-agnostic - a synced provider label reaches this already resolved to a
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

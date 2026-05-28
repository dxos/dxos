//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React from 'react';

import { Annotation, Filter, Obj, Type } from '@dxos/echo';
import { EchoURI } from '@dxos/keys';
import { getSpace, useQuery } from '@dxos/react-client/echo';
import { type Message } from '@dxos/types';

import { useExtractedObjects } from '../../hooks';
import { Mailbox } from '../../types';
import { AnchorIconButton } from '../AnchorIconButton';

/**
 * Renders the related-entity chip rows below the sender row in `MessageHeader`. Merges TWO
 * sources into one chip row so the header reads as a single list of related entities:
 *
 *   - **Extracted relations** (task #16): one row per ECHO object the message produced — Trip,
 *     Booking, etc. Sourced from `ExtractedFrom` relations whose Target is the message.
 *     Each row's icon opens a card preview via `DxAnchorActivate` (deck plugin handler).
 *   - **Applied tags** (task #15): one row per entry in the owning `Mailbox.tags` whose
 *     `messages` array includes a Ref to this message. Covers both Gmail-synced provider
 *     labels and user-applied tags.
 *
 * Both render with the same `[2rem icon | 1fr label]` grid as the sender row so the header
 * reads as one consistent column. Tag rows have no DXN, so their icon button falls back to
 * a no-op disabled state; that's fine because tags aren't standalone navigable entities.
 */
export const ExtractedTags = ({ message }: { message: Message.Message }) => {
  const space = getSpace(message);
  const db = space?.db;
  const objects = useExtractedObjects(db, message);
  const mailboxes = useQuery(db, Filter.type(Mailbox.Mailbox));
  // Compute inline (no useMemo) so ECHO's reactive proxy registers our reads against the
  // mailbox's `tags` field and re-renders on mutation. `useMemo` would freeze the access at
  // first render and miss subsequent `applyTag` writes.
  const tags = mailboxes.flatMap((mailbox) => Mailbox.getTagsForMessage(mailbox, message));

  if (objects.length === 0 && tags.length === 0) {
    return null;
  }

  return (
    <div className='flex flex-col gap-1' data-testid='extracted-tags'>
      {objects.map((object) => (
        <ExtractedObjectRow key={Obj.getURI(object).toString()} object={object} />
      ))}
      {tags.map((tag) => (
        <TagRow key={tag.id} tag={tag} />
      ))}
    </div>
  );
};

const ExtractedObjectRow = ({ object }: { object: Obj.Any }) => {
  const label = Obj.getLabel(object) ?? Type.getTypename(object) ?? 'object';
  const icon = iconForObject(object);
  const uri = Obj.getURI(object);
  const echoUri = EchoURI.tryParse(uri.toString());

  return (
    <div
      className='grid grid-cols-[2rem_1fr] gap-1 items-center'
      data-testid={`extracted-tag-${object.id}`}
    >
      <AnchorIconButton icon={icon} label={label} title={label} value={echoUri} />
      <h3 className='truncate text-primary-text'>{label}</h3>
    </div>
  );
};

const TagRow = ({ tag }: { tag: { id: string; label: string; hue?: string } }) => {
  return (
    <div
      className='grid grid-cols-[2rem_1fr] gap-1 items-center'
      data-testid={`message-tag-${tag.id}`}
    >
      <AnchorIconButton icon='ph--tag--regular' label={tag.label} title={tag.label} />
      <h3 className='truncate text-primary-text' data-hue={tag.hue}>
        {tag.label}
      </h3>
    </div>
  );
};

/**
 * Resolve the phosphor icon from the object's type-level `IconAnnotation` (set on the schema
 * via `Annotation.IconAnnotation.set({ icon, hue })`). Falls back to a generic cube glyph
 * when the object's type isn't registered in the runtime or the annotation is absent.
 */
const iconForObject = (object: Obj.Any): string => {
  const type = Obj.getType(object);
  if (!type) {
    return 'ph--cube--regular';
  }
  const schema = Type.getSchema(type);
  return (
    Annotation.IconAnnotation.get(schema).pipe(Option.getOrUndefined)?.icon ?? 'ph--cube--regular'
  );
};

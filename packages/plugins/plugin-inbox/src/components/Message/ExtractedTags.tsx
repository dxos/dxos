//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React, { useCallback, useRef } from 'react';

import { Annotation, Filter, Obj, Type } from '@dxos/echo';
import { DxAnchorActivate, Tag } from '@dxos/react-ui';
import { type ChromaticPalette, type NeutralPalette } from '@dxos/ui-types';
import { getSpace, useQuery } from '@dxos/react-client/echo';
import { type Message } from '@dxos/types';

import { useExtractedObjects } from '../../hooks';
import { Mailbox } from '../../types';

const PALETTES: ReadonlySet<ChromaticPalette | NeutralPalette> = new Set([
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
  'neutral',
]);

/**
 * Single horizontal chip row below the sender row in `MessageHeader`. Merges both sources
 * into the same row so the header reads as one continuous list of related entities:
 *
 *   - **Extracted relations** (task #16): one chip per ECHO object the message produced —
 *     Trip, Booking, etc. Sourced from `ExtractedFrom` relations whose Target is the
 *     message. Each chip is wrapped in a button so clicking opens a card preview via
 *     `DxAnchorActivate` (deck plugin handler). Colour comes from the type's
 *     `IconAnnotation.hue`.
 *   - **Applied tags** (task #15): one chip per entry in the owning `Mailbox.tags` whose
 *     `messages` array includes a Ref to this message. Covers both Gmail-synced provider
 *     labels and user-applied tags. Colour comes from the tag entry's `hue` field.
 *
 * Both render as `Tag` components from `@dxos/react-ui` (chromatic palette + chip styling),
 * so the row reads as one visual unit regardless of source.
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
    <div className='flex flex-wrap gap-1' data-testid='extracted-tags'>
      {objects.map((object) => (
        <ExtractedObjectTag key={Obj.getURI(object).toString()} object={object} />
      ))}
      {tags.map((tag) => (
        <Tag
          key={tag.id}
          palette={paletteOf(tag.hue)}
          data-testid={`message-tag-${tag.id}`}
        >
          {tag.label}
        </Tag>
      ))}
    </div>
  );
};

const ExtractedObjectTag = ({ object }: { object: Obj.Any }) => {
  const label = Obj.getLabel(object) ?? Type.getTypename(object) ?? 'object';
  const uri = Obj.getURI(object).toString();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = useCallback(() => {
    buttonRef.current?.dispatchEvent(
      new DxAnchorActivate({
        trigger: buttonRef.current,
        dxn: uri,
        label: 'never',
        kind: 'card',
        title: label,
      }),
    );
  }, [uri, label]);

  return (
    <Tag asChild palette={paletteOfObject(object)} data-testid={`extracted-tag-${object.id}`}>
      <button type='button' onClick={handleClick} aria-label={label} ref={buttonRef}>
        {label}
      </button>
    </Tag>
  );
};

/**
 * Resolve a react-ui palette from an object's type-level `IconAnnotation` (the `hue` field).
 * Falls back to `neutral` when the type isn't registered or the annotation is absent.
 */
const paletteOfObject = (object: Obj.Any): ChromaticPalette | NeutralPalette => {
  const type = Obj.getType(object);
  if (!type) {
    return 'neutral';
  }
  const schema = Type.getSchema(type);
  const hue = Annotation.IconAnnotation.get(schema).pipe(Option.getOrUndefined)?.hue;
  return paletteOf(hue);
};

const paletteOf = (hue: string | undefined): ChromaticPalette | NeutralPalette =>
  hue && PALETTES.has(hue as ChromaticPalette) ? (hue as ChromaticPalette) : 'neutral';

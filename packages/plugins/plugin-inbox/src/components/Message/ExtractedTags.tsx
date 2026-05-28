//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React, { useCallback, useRef } from 'react';

import { Annotation, Filter, Obj, Type } from '@dxos/echo';
import { EchoURI } from '@dxos/keys';
import { getSpace, useQuery } from '@dxos/react-client/echo';
import { DxAnchorActivate, Tag } from '@dxos/react-ui';
import { type Hue, palette } from '@dxos/ui-theme';
import { type Actor, type Message } from '@dxos/types';

import { useExtractedObjects } from '../../hooks';
import { Mailbox } from '../../types';
import { UserIconButton } from '../UserIconButton';

/** Names recognised by the react-ui `Tag` `palette` prop, sourced from the ui-theme catalogue. */
const VALID_HUES: ReadonlySet<Hue> = new Set<Hue>([palette.neutral.hue, ...palette.hues.map((s) => s.hue)]);

/**
 * Renders the related-entity rows below the subject row in `MessageHeader`. Two subgrid
 * rows under MessageHeader's outer `[2rem icon | 1fr content]` grid:
 *
 *   - **Sender row** — the avatar icon-button (`UserIconButton`) in the icon column and
 *     the sender name in the content column. Moved here from `MessageHeader` so all
 *     "things related to this message" are owned by one component.
 *   - **Chips row** — a single horizontal `flex` of `Tag` components in the content
 *     column. Merges two sources:
 *       1. *Extracted relations* (task #16): chips for ECHO objects the message produced.
 *          Each wraps a `<button>` so clicking opens a card preview via `DxAnchorActivate`.
 *       2. *Applied tags* (task #15): chips for entries in `Mailbox.tags` whose `messages`
 *          array includes a Ref to this message.
 *
 * The chips row is omitted when there are no extracted objects AND no applied tags.
 */
export const ExtractedTags = ({
  message,
  sender,
  onContactCreate,
}: {
  message: Message.Message;
  sender?: EchoURI.EchoURI;
  onContactCreate?: (actor: Actor.Actor) => void;
}) => {
  const space = getSpace(message);
  const db = space?.db;
  const objects = useExtractedObjects(db, message);
  const mailboxes = useQuery(db, Filter.type(Mailbox.Mailbox));
  // Compute inline (no useMemo) so ECHO's reactive proxy registers our reads against the
  // mailbox's `tags` field and re-renders on mutation.
  const tags = mailboxes.flatMap((mailbox) => Mailbox.getTagsForMessage(mailbox, message));

  const hasChips = objects.length > 0 || tags.length > 0;

  return (
    <>
      <div className='col-span-2 grid grid-cols-subgrid items-center'>
        <UserIconButton
          title={message.sender.name}
          value={sender}
          onContactCreate={() => onContactCreate?.(message.sender)}
        />
        <h3 className='truncate text-primary-text'>{message.sender.name || message.sender.email}</h3>
      </div>
      {hasChips && (
        <div className='col-span-2 grid grid-cols-subgrid items-start'>
          <span />
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
        </div>
      )}
    </>
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

const paletteOfObject = (object: Obj.Any): Hue => {
  const type = Obj.getType(object);
  if (!type) {
    return 'neutral';
  }
  const schema = Type.getSchema(type);
  const hue = Annotation.IconAnnotation.get(schema).pipe(Option.getOrUndefined)?.hue;
  return paletteOf(hue);
};

const paletteOf = (hue: string | undefined): Hue =>
  hue && VALID_HUES.has(hue as Hue) ? (hue as Hue) : 'neutral';

//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import React from 'react';

import { Annotation, Filter, Obj, Type } from '@dxos/echo';
import { EchoURI } from '@dxos/keys';
import { getSpace, useQuery } from '@dxos/react-client/echo';
import { Icon, Tag } from '@dxos/react-ui';
import { type Actor, type Message } from '@dxos/types';
import { type Hue, palette } from '@dxos/ui-theme';

import { useExtractedObjects } from '../../hooks';
import { Mailbox } from '../../types';
import { AnchorIconButton } from '../AnchorIconButton';
import { UserIconButton } from '../UserIconButton';

/** Names recognised by the react-ui `Tag` `palette` prop, sourced from the ui-theme catalogue. */
const VALID_HUES: ReadonlySet<Hue> = new Set<Hue>([palette.neutral.hue, ...palette.hues.map((s) => s.hue)]);

export const Headers = ({
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

  return (
    <>
      {/* TODO(burdon): List other To/CC/BCC. */}
      <div className='col-span-2 grid grid-cols-subgrid items-center'>
        <UserIconButton
          title={message.sender.name}
          value={sender}
          onContactCreate={() => onContactCreate?.(message.sender)}
        />
        <h3 className='truncate text-primary-text'>{message.sender.name || message.sender.email}</h3>
      </div>

      {objects.map((object) => (
        <ExtractedObjectRow key={Obj.getURI(object).toString()} object={object} />
      ))}

      {tags.length > 0 && (
        <div className='col-span-2 grid grid-cols-subgrid items-start'>
          <div className='flex px-2 pt-1.5 text-subdued' aria-hidden='true'>
            <Icon icon='ph--tag--regular' />
          </div>
          <div className='flex flex-wrap gap-1' data-testid='extracted-tags'>
            {tags.map((tag) => (
              <Tag key={tag.id} palette={paletteOf(tag.hue)} data-testid={`message-tag-${tag.id}`}>
                {tag.label}
              </Tag>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

const ExtractedObjectRow = ({ object }: { object: Obj.Any }) => {
  const label = Obj.getLabel(object) ?? Type.getTypename(object) ?? 'object';
  const icon = iconForObject(object);
  const echoUri = EchoURI.tryParse(Obj.getURI(object).toString());

  return (
    <div className='col-span-2 grid grid-cols-subgrid items-center' data-testid={`extracted-tag-${object.id}`}>
      <AnchorIconButton icon={icon} label={label} title={label} value={echoUri} />
      <h3 className='truncate text-primary-text'>{label}</h3>
    </div>
  );
};

/**
 * Resolve the phosphor icon from the object's type-level `IconAnnotation` (set on the
 * schema via `Annotation.IconAnnotation.set({ icon, hue })`). Falls back to a generic
 * cube glyph when the object's type isn't registered in the runtime or the annotation
 * is absent.
 */
const iconForObject = (object: Obj.Any): string => {
  const type = Obj.getType(object);
  if (!type) {
    return 'ph--cube--regular';
  }
  const schema = Type.getSchema(type);
  return Annotation.IconAnnotation.get(schema).pipe(Option.getOrUndefined)?.icon ?? 'ph--cube--regular';
};

const paletteOf = (hue: string | undefined): Hue => (hue && VALID_HUES.has(hue as Hue) ? (hue as Hue) : 'neutral');

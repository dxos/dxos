//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useReducer } from 'react';

import { Filter, Obj } from '@dxos/echo';
import { EchoURI } from '@dxos/keys';
import { getSpace, useQuery } from '@dxos/react-client/echo';
import { Icon, IconBlock, Tag } from '@dxos/react-ui';
import { type Actor, type Message } from '@dxos/types';
import { type Hue, palette } from '@dxos/ui-theme';

import { useExtractedObjects } from '../../hooks';
import { Mailbox } from '../../types';
import { AnchorIconButton } from '../AnchorIconButton';
import { UserIconButton } from '../UserIconButton';

/** Names recognised by the react-ui `Tag` `palette` prop, sourced from the ui-theme catalogue. */
const VALID_HUES: ReadonlySet<Hue> = new Set<Hue>([palette.neutral.hue, ...palette.hues.map((s) => s.hue)]);

const paletteOf = (hue: string | undefined): Hue => (hue && VALID_HUES.has(hue as Hue) ? (hue as Hue) : 'neutral');

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
  // `useQuery` only fires when the matching set changes, not when nested fields mutate.
  // Subscribe directly to each mailbox so tag-only extractor runs (no created objects,
  // no relation, just a `mailbox.tags` mutation) still trigger a re-render here.
  const [, bump] = useReducer((tick: number) => tick + 1, 0);
  useEffect(() => {
    const unsubs = mailboxes.map((mailbox) => Obj.subscribe(mailbox, bump));
    return () => unsubs.forEach((unsub) => unsub());
  }, [mailboxes]);
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
        <div className='col-span-2 grid grid-cols-subgrid items-center'>
          <IconBlock classNames='text-subdued' aria-hidden='true'>
            <Icon icon='ph--tag--regular' />
          </IconBlock>
          <div className='flex flex-wrap gap-1 -mx-0.5' data-testid='extracted-tags'>
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
  const label = Obj.getLabel(object, { fallback: 'typename' }) ?? 'object';
  const icon = Obj.getIcon(object)?.icon ?? 'ph--cube--regular';
  const echoUri = EchoURI.tryParse(Obj.getURI(object).toString());

  return (
    <div className='col-span-2 grid grid-cols-subgrid items-center' data-testid={`extracted-tag-${object.id}`}>
      <AnchorIconButton icon={icon} label={label} title={label} value={echoUri} />
      <h3 className='truncate text-primary-text'>{label}</h3>
    </div>
  );
};

//
// Copyright 2023 DXOS.org
//

import { UserCircle, X } from '@phosphor-icons/react';
import format from 'date-fns/format';
import React, { forwardRef, useId } from 'react';

import { type Thread as ThreadType } from '@braneframe/types';
import { Card } from '@dxos/aurora';
import { Mosaic, type MosaicTileComponent } from '@dxos/aurora-grid/next';
import { getSize, inputSurface, mx } from '@dxos/aurora-theme';
import { type Expando, Text } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/react-client';

import { useSubscription } from '../util';

export type BlockProperties = {
  displayName?: string;
  classes: string;
};

export type ThreadBlockProps = {
  block: ThreadType.Block;
  identityKey: PublicKey;
  getBlockProperties: (identityKey: PublicKey) => BlockProperties;
  onDelete?: (blockId: string, idx: number) => void;
};

export const ThreadBlock = ({ block, getBlockProperties, onDelete }: ThreadBlockProps) => {
  useSubscription(block.messages); // TODO(burdon): Not updated.
  if (!block.messages.length || !block.identityKey) {
    return null;
  }

  const message = block.messages[0]!;
  const { classes, displayName } = getBlockProperties(PublicKey.from(block.identityKey!));
  const date = message.timestamp ? new Date(message.timestamp) : undefined;

  // TODO(burdon): Use aurora cards.
  // TODO(burdon): Reply button.
  return (
    <div
      key={block.id}
      className={mx(
        'flex flex-col overflow-hidden rounded shadow',
        inputSurface,
        // !PublicKey.equals(identityKey, PublicKey.from(block.identityKey)) && 'rounded shadow',
      )}
    >
      <div className='flex'>
        <div className='flex shrink-0 w-[40px] h-[40px] items-center justify-center'>
          <UserCircle weight='duotone' className={mx(getSize(7), classes)} />
        </div>
        <div className='flex flex-col w-full overflow-hidden'>
          <div className='flex text-sm px-2 py-1 space-x-1 truncate'>
            <span className={mx('flex grow whitespace-nowrap truncate font-thin text-zinc-500')}>{displayName}</span>
            {date && (
              <>
                <span className='font-mono text-xs'>{format(date, 'HH:mm')}</span>
                <span className='font-mono text-xs'>{format(date, 'aaa')}</span>
              </>
            )}
          </div>

          <div className='overflow-hidden pb-1'>
            {block.messages.map((message, i) => (
              <ThreadMessage key={i} message={message} onDelete={onDelete && (() => onDelete(block.id, i))} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ThreadMessage = ({ message, onDelete }: { message: ThreadType.Message; onDelete?: () => void }) => {
  const id = useId();

  if (message.ref) {
    return (
      <div className='flex overflow-hidden px-2 py-1 group'>
        <Mosaic.Container id={id} Component={Pill}>
          <Mosaic.DraggableTile path={id} item={message.ref} Component={Pill} />
        </Mosaic.Container>

        {/* <div className='grow overflow-hidden break-words mr-2 text-sm m-2 border-1'>Reference [{message.ref.__typename}] to {name}M</div> */}

        {onDelete && (
          <button className='invisible group-hover:visible' onClick={onDelete}>
            <X />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className='flex overflow-hidden px-2 py-1 group'>
      {message.text && <div className='grow overflow-hidden break-words mr-2 text-sm'>{message.text}</div>}
      {message.data && (
        // TODO(burdon): Colorize (reuse codemirror or hljs?)
        <pre className='grow overflow-x-auto mr-2 py-2 text-sm font-thin'>
          <code>{JSON.stringify(safeParseJson(message.data), undefined, 2)}</code>
        </pre>
      )}
      {onDelete && (
        <button className='invisible group-hover:visible' onClick={onDelete}>
          <X />
        </button>
      )}
    </div>
  );
};

const colors: Record<string, string> = {
  gray: 'bg-neutral-50',
  red: 'bg-red-50',
  orange: 'bg-orange-50',
  green: 'bg-green-50',
  blue: 'bg-blue-50',
};

const Pill: MosaicTileComponent<Expando> = forwardRef(({ draggableStyle, draggableProps, item, path }, forwardRef) => {
  let title = item.name ?? item.title ?? item.__typename ?? 'Object';
  if (title instanceof Text) {
    title = title.text;
  }
  const color = (item.color && colors[item.color]) ?? colors.gray;
  return (
    <Card.Root ref={forwardRef} style={draggableStyle} classNames={color}>
      <Card.Header>
        <Card.DragHandle {...draggableProps} />
        <Card.Title title={title} classNames='truncate font-mono text-xs' />
      </Card.Header>
    </Card.Root>
  );
});

// TODO(burdon): Move to util.
export const safeParseJson = (data: string) => {
  try {
    return JSON.parse(data);
  } catch (err) {
    return data;
  }
};

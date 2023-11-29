//
// Copyright 2023 DXOS.org
//

import { UserCircle, X } from '@phosphor-icons/react';
import format from 'date-fns/format';
import React, { forwardRef, useId } from 'react';

import { type Message as MessageType } from '@braneframe/types';
import { PublicKey } from '@dxos/react-client';
import { type Expando, TextObject } from '@dxos/react-client/echo';
import { Card, DensityProvider } from '@dxos/react-ui';
import { Mosaic, type MosaicTileComponent } from '@dxos/react-ui-mosaic';
import { getSize, inputSurface, mx } from '@dxos/react-ui-theme';

import { THREAD_ITEM } from '../../meta';
import { useSubscription } from '../util';

export type BlockProperties = {
  displayName?: string;
  classes?: string;
};

export type ThreadMessageProps = {
  message: MessageType;
  identityKey: PublicKey;
  propertiesProvider: (identityKey: PublicKey) => BlockProperties;
  onDelete?: (blockId: string, idx: number) => void;
};

export const MessageCard = ({ message, propertiesProvider, onDelete }: ThreadMessageProps) => {
  useSubscription(message.blocks); // TODO(burdon): Not updated.
  if (!message.blocks.length || !message.identityKey) {
    return null;
  }

  const message2 = message.blocks[0]!;
  const { classes, displayName } = propertiesProvider(PublicKey.from(message.identityKey!));
  const date = message2.timestamp ? new Date(message2.timestamp) : undefined;

  // TODO(burdon): Use aurora cards.
  // TODO(burdon): Reply button.
  return (
    <DensityProvider density='fine'>
      <div
        key={message.id}
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
              {message.blocks.map((block, i) => (
                <ThreadBlock key={i} block={block} onDelete={onDelete && (() => onDelete(message.id, i))} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </DensityProvider>
  );
};

const ThreadBlock = ({ block, onDelete }: { block: MessageType.Block; onDelete?: () => void }) => {
  const id = useId();

  if (block.object) {
    return (
      <div className='flex overflow-hidden px-2 py-1 group'>
        <Mosaic.Container id={id} Component={Pill}>
          <Mosaic.DraggableTile type={THREAD_ITEM} path={id} item={block.object} Component={Pill} onRemove={onDelete} />
        </Mosaic.Container>
      </div>
    );
  }

  return (
    <div className='flex overflow-hidden px-2 py-1 group'>
      {block.text && <div className='grow overflow-hidden break-words mr-2 text-sm'>{block.text}</div>}
      {block.data && (
        // TODO(burdon): Colorize (reuse codemirror or hljs?)
        <pre className='grow overflow-x-auto mr-2 py-2 text-sm font-thin'>
          <code>{JSON.stringify(safeParseJson(block.data), undefined, 2)}</code>
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

// TODO(burdon): Reuse SearchResult component.
const Pill: MosaicTileComponent<Expando> = forwardRef(
  ({ draggableStyle, draggableProps, item, onRemove }, forwardRef) => {
    let title = item.name ?? item.title ?? item.__typename ?? 'Object';
    if (title instanceof TextObject) {
      title = title.text;
    }

    return (
      <Card.Root ref={forwardRef} style={draggableStyle} classNames='w-full bg-neutral-50'>
        <Card.Header>
          <Card.DragHandle {...draggableProps} />
          <Card.Title title={title} />
          <Card.Endcap Icon={X} onClick={onRemove} />
        </Card.Header>
      </Card.Root>
    );
  },
);

// TODO(burdon): Move to util.
export const safeParseJson = (data: string) => {
  try {
    return JSON.parse(data);
  } catch (err) {
    return data;
  }
};

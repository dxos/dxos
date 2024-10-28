//
// Copyright 2023 DXOS.org
//

import React, { forwardRef } from 'react';

import { DropdownMenu } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-card';
import type { MosaicTileComponent } from '@dxos/react-ui-mosaic';
import { mx } from '@dxos/react-ui-theme';

import { type FileType } from '../types';

export type FileCardProps = {
  id: string;
  object: FileType;
};

const FileCard: MosaicTileComponent<FileCardProps> = forwardRef(
  (
    { classNames, isDragging, draggableStyle, draggableProps, item: { id, object: file }, grow, onSelect, onAction },
    forwardRef,
  ) => {
    const url = 'TODO';

    return (
      <div role='none' ref={forwardRef} className='flex w-full' style={draggableStyle}>
        <Card.Root classNames={mx('w-full snap-center', isDragging && 'opacity-20', classNames)} grow={grow}>
          <Card.Header onDoubleClick={() => onSelect?.()} floating={!!url}>
            <Card.DragHandle {...draggableProps} position='left' />
            <Card.Menu position='right'>
              {/* TODO(burdon): Handle events/intents? */}
              <DropdownMenu.Item onClick={() => onAction?.({ id, action: 'delete' })}>
                <span className='grow'>Delete</span>
              </DropdownMenu.Item>
            </Card.Menu>
          </Card.Header>
          <Card.Media src={url} />
        </Card.Root>
      </div>
    );
  },
);

export default FileCard;

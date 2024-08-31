//
// Copyright 2023 DXOS.org
//
import React, { forwardRef, useState } from 'react';

import { toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Mosaic, type MosaicDropEvent, type MosaicMoveEvent, type MosaicTileComponent } from '@dxos/react-ui-mosaic';
import { mx } from '@dxos/react-ui-theme';

import { translationKey } from '../translations';
import { type NavTreeItemNode } from '../types';

export const DropZone = () => {
  const [item, setItem] = useState<NavTreeItemNode | null>(null);
  const handleOver = ({ over }: MosaicMoveEvent) => (over.path === 'dropzone' ? 'copy' : 'reject');
  const handleDrop = ({ active }: MosaicDropEvent) => setItem(active.item as NavTreeItemNode);

  return (
    <Mosaic.Container id='dropzone' onOver={handleOver} onDrop={handleDrop}>
      <Mosaic.DroppableTile Component={DropComponent} path='dropzone' item={{ id: 'dropzone', node: item }} />
    </Mosaic.Container>
  );
};

const DropComponent: MosaicTileComponent<NavTreeItemNode> = forwardRef(({ isOver, item }, forwardedRef) => {
  const { t } = useTranslation(translationKey);
  return (
    <div
      ref={forwardedRef}
      className={mx(
        'flex flex-1 items-center justify-center border-2 border-dashed border-gray-400 text-gray-400',
        isOver && 'border-solid bg-gray-200',
      )}
    >
      {item ? (
        <>
          {item.node.properties?.iconSymbol && (
            <svg>
              <use href={`/icons.svg#${item.node.properties.iconSymbol}`} />
            </svg>
          )}
          {toLocalizedString(item.node.properties?.label ?? 'never', t)}
        </>
      ) : (
        'Drop Zone'
      )}
    </div>
  );
});

//
// Copyright 2023 DXOS.org
//
import React, { forwardRef, useState } from 'react';

import { toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Mosaic, type MosaicDropEvent, type MosaicMoveEvent, type MosaicTileComponent } from '@dxos/react-ui-mosaic';
import { mx } from '@dxos/react-ui-theme';

import { type NavTreeItemData } from '../components';
import { translationKey } from '../translations';

export const DropZone = () => {
  const [item, setItem] = useState<NavTreeItemData | null>(null);
  const handleOver = ({ over }: MosaicMoveEvent) => (over.path === 'dropzone' ? 'copy' : 'reject');
  const handleDrop = ({ active }: MosaicDropEvent) => setItem(active.item as NavTreeItemData);

  return (
    <Mosaic.Container id='dropzone' onOver={handleOver} onDrop={handleDrop}>
      <Mosaic.DroppableTile Component={DropComponent} path='dropzone' item={{ id: 'dropzone', node: item }} />
    </Mosaic.Container>
  );
};

const DropComponent: MosaicTileComponent<NavTreeItemData> = forwardRef(({ isOver, item }, forwardedRef) => {
  const { t } = useTranslation(translationKey);
  return (
    <div
      ref={forwardedRef}
      className={mx(
        'flex flex-1 items-center justify-center text-gray-400 border-2 border-gray-400 border-dashed',
        isOver && 'bg-gray-200 border-solid',
      )}
    >
      {item ? (
        <>
          {item.icon && <item.icon />}
          {toLocalizedString(item.label, t)}
        </>
      ) : (
        'Drop Zone'
      )}
    </div>
  );
});

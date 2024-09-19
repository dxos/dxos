//
// Copyright 2024 DXOS.org
//
import '@dxos/lit-grid/dx-grid.pcss';

import { createComponent, type EventName } from '@lit/react';
import React, { useCallback, useState } from 'react';

import { type DxAxisResize, type DxEditRequest, DxGrid as NaturalDxGrid, type DxGridProps } from '@dxos/lit-grid';

const DxGrid = createComponent({
  tagName: 'dx-grid',
  elementClass: NaturalDxGrid,
  react: React,
  events: {
    onAxisResize: 'dx-axis-resize' as EventName<DxAxisResize>,
    onEdit: 'dx-edit-request' as EventName<DxEditRequest>,
  },
});

export type GridProps = DxGridProps & {
  onAxisResize: (event: DxAxisResize) => void;
  onEdit: (event: DxEditRequest) => void;
};

export const Grid = (props: GridProps) => {
  const [editBox, setEditBox] = useState<DxEditRequest['cellBox']>({
    insetInlineStart: 0,
    insetBlockStart: 0,
    inlineSize: 0,
    blockSize: 0,
  });
  const handleEdit = useCallback((event: DxEditRequest) => {
    setEditBox(event.cellBox);
    props?.onEdit?.(event);
  }, []);
  return (
    <>
      <div className='absolute bg-accentSurface z-[1]' style={editBox} />
      <DxGrid {...props} onEdit={handleEdit} />
    </>
  );
};

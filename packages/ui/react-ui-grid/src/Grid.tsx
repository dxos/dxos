//
// Copyright 2024 DXOS.org
//
import '@dxos/lit-grid/dx-grid.pcss';

import { createComponent, type EventName } from '@lit/react';
import React, { useCallback, useState } from 'react';

import { type DxAxisResize, type DxEditRequest, DxGrid as NaturalDxGrid, type DxGridProps } from '@dxos/lit-grid';
import { listener, useTextEditor } from '@dxos/react-ui-editor';
import { isNotFalsy } from '@dxos/util';

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
  id: string;
  onAxisResize: (event: DxAxisResize) => void;
  onEdit: (event: DxEditRequest) => void;
};

const initialBox = {
  insetInlineStart: 0,
  insetBlockStart: 0,
  inlineSize: 0,
  blockSize: 0,
} satisfies DxEditRequest['cellBox'];

export const Grid = (props: GridProps) => {
  const [editBox, setEditBox] = useState<DxEditRequest['cellBox']>(initialBox);
  const [editing, setEditing] = useState(false);

  const { parentRef, focusAttributes } = useTextEditor(
    () => ({
      id: props.id,
      autoFocus: editing,
      extensions: [
        listener({
          onFocus: (focusing) => {
            if (!focusing && editing) {
              setEditing(false);
            }
          },
        }),
      ].filter(isNotFalsy),
    }),
    [editing],
  );

  const handleEdit = useCallback((event: DxEditRequest) => {
    setEditBox(event.cellBox);
    setEditing(true);
    props?.onEdit?.(event);
  }, []);

  return (
    <>
      <div
        className='absolute data-[editing=true]:z-[1]'
        data-editing={editing}
        {...focusAttributes}
        style={editBox}
        tabIndex={editing ? 0 : -1}
        ref={parentRef}
      />
      <DxGrid {...props} mode={editing ? 'edit' : 'browse'} onEdit={handleEdit} />
    </>
  );
};

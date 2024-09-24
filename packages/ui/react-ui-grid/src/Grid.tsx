//
// Copyright 2024 DXOS.org
//

import '@dxos/lit-grid/dx-grid.pcss';

import { createComponent, type EventName } from '@lit/react';
import React, { type KeyboardEvent, useCallback, useRef, useState } from 'react';

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
  const gridRef = useRef<NaturalDxGrid | null>(null);
  const [editBox, setEditBox] = useState<DxEditRequest['cellBox']>(initialBox);
  const [editing, setEditing] = useState<DxEditRequest['cellIndex'] | null>(null);

  const {
    parentRef: textboxRef,
    focusAttributes,
    view,
  } = useTextEditor(
    () => ({
      id: props.id,
      autoFocus: !!editing,
      extensions: [
        listener({
          onFocus: (focusing: boolean) => {
            if (!focusing && editing) {
              setEditing(null);
            }
          },
        }),
      ].filter(isNotFalsy),
    }),
    [editing],
  );

  const handleEdit = useCallback((event: DxEditRequest) => {
    setEditBox(event.cellBox);
    setEditing(event.cellIndex);
    props?.onEdit?.(event);
  }, []);

  const handleEditorKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (editing) {
        switch (event.key) {
          case 'Enter':
            // console.warn('to do: save content');
            setEditing(null);
            gridRef.current?.refocus('down');
            break;
          case 'Escape':
            setEditing(null);
            gridRef.current?.refocus();
            break;
        }
      }
    },
    [editing, view],
  );

  return (
    <>
      <div
        className='absolute z-[1] hidden data-[editing=true]:block border p-px border-accentSurface'
        data-editing={!!editing}
        {...focusAttributes}
        style={editBox}
        tabIndex={editing ? 0 : -1}
        onKeyDown={handleEditorKeyDown}
        ref={textboxRef}
      />
      <DxGrid {...props} mode={editing ? 'edit' : 'browse'} onEdit={handleEdit} ref={gridRef} />
    </>
  );
};

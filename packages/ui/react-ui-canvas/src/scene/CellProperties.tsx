//
// Copyright 2026 DXOS.org
//

//
// Property panel for the selected cell: a schema-driven form over the cell's own Effect schema, so
// every field the model has is editable without a per-kind form. Edits go through the projection as
// `update` intents; the panel never mutates the scene.
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useCallback } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { mx } from '@dxos/ui-theme';

import { type SceneViewAtoms } from './atoms.ts';
import { type Projection } from './projection.ts';
import { type Cell, LinkCell, PortalCell, RectCell, TextCell } from './types.ts';

/** Identity and ordering are the surface's, not the user's. */
const HIDDEN = ['id', 'kind', 'z'];

export type CellPropertiesProps = ThemedClassName<{
  projection: Projection;
  atoms: SceneViewAtoms;
}>;

export const CellProperties = ({ classNames, projection, atoms }: CellPropertiesProps) => {
  const scene = useAtomValue(projection.scene);
  const selection = useAtomValue(atoms.selection);
  const ids = [...selection];
  const cell = ids.length === 1 ? scene.cells[ids[0]] : undefined;
  const readonly = !projection.capabilities.update;

  const onSave = useCallback(
    (values: Cell) => {
      if (cell) {
        projection.apply({ kind: 'update', id: cell.id, values });
      }
    },
    [projection, cell],
  );

  return (
    <div className={mx('flex flex-col overflow-hidden', classNames)} data-testid='cell-properties'>
      {!cell ? (
        <div className='p-2 text-sm text-description'>
          {ids.length === 0 ? 'Select a cell to edit its properties.' : `${ids.length} cells selected.`}
        </div>
      ) : (
        <CellForm key={cell.id} cell={cell} readonly={readonly} onSave={onSave} />
      )}
    </div>
  );
};

type CellFormProps = { cell: Cell; readonly: boolean; onSave: (values: Cell) => void };

const CellForm = ({ cell, readonly, onSave }: CellFormProps) => {
  switch (cell.kind) {
    case 'rect':
      return (
        <Form.Root schema={RectCell} values={cell} readonly={readonly} autoSave onSave={onSave}>
          <Form.Viewport>
            <Form.Content>
              <Form.Fields exclude={HIDDEN} />
            </Form.Content>
          </Form.Viewport>
        </Form.Root>
      );
    case 'text':
      return (
        <Form.Root schema={TextCell} values={cell} readonly={readonly} autoSave onSave={onSave}>
          <Form.Viewport>
            <Form.Content>
              <Form.Fields exclude={HIDDEN} />
            </Form.Content>
          </Form.Viewport>
        </Form.Root>
      );
    case 'scene':
      return (
        <Form.Root schema={PortalCell} values={cell} readonly={readonly} autoSave onSave={onSave}>
          <Form.Viewport>
            <Form.Content>
              <Form.Fields exclude={HIDDEN} />
            </Form.Content>
          </Form.Viewport>
        </Form.Root>
      );
    case 'link':
      return (
        <Form.Root schema={LinkCell} values={cell} readonly={readonly} autoSave onSave={onSave}>
          <Form.Viewport>
            <Form.Content>
              <Form.Fields exclude={HIDDEN} />
            </Form.Content>
          </Form.Viewport>
        </Form.Root>
      );
  }
};

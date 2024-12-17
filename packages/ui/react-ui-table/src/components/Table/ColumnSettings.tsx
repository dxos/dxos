//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { getSpace } from '@dxos/react-client/echo';
import { DropdownMenu } from '@dxos/react-ui';
import { FieldEditor } from '@dxos/react-ui-form';
import { type FieldType } from '@dxos/schema';

import { type TableModel, type ModalController } from '../../model';

type ColumnSettingsProps = { model?: TableModel; modals: ModalController; onNewColumn: () => void };

export const ColumnSettings = ({ model, modals, onNewColumn }: ColumnSettingsProps) => {
  const [newField, setNewField] = useState<FieldType>();
  const state = modals.state.value;

  const space = getSpace(model?.table);

  useEffect(() => {
    if (state?.type === 'columnSettings' && state.mode.type === 'create' && model?.projection) {
      setNewField(model.projection.createFieldProjection());
      requestAnimationFrame(() => {
        onNewColumn();
      });
    } else {
      setNewField(undefined);
    }
  }, [model?.projection, state]);

  const existingField = useMemo(() => {
    if (state?.type === 'columnSettings') {
      const { mode } = state;
      if (mode.type === 'edit') {
        return model?.table?.view?.fields.find((f) => f.id === mode.fieldId);
      }
    }
    return undefined;
  }, [model?.table?.view?.fields, state]);

  const field = existingField ?? newField;

  const handleSave = useCallback(() => {
    modals.close();
  }, [modals]);

  const handleCancel = useCallback(() => {
    if (state?.type === 'columnSettings' && state.mode.type === 'create' && newField) {
      model?.projection?.deleteFieldProjection(newField.id);
    }
  }, [model?.projection, state, newField]);

  if (!model?.table?.view || !model.projection || !field) {
    return null;
  }

  return (
    <DropdownMenu.Root modal={false} open={state?.type === 'columnSettings'}>
      <DropdownMenu.VirtualTrigger virtualRef={modals.trigger} />
      <DropdownMenu.Portal>
        <DropdownMenu.Content classNames='md:is-64'>
          <DropdownMenu.Viewport>
            <FieldEditor
              view={model.table.view}
              projection={model.projection}
              field={field}
              registry={space?.db.schemaRegistry}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

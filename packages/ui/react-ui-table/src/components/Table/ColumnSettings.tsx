//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Popover } from '@dxos/react-ui';
import { FieldEditor } from '@dxos/react-ui-form';
import { type FieldType } from '@dxos/schema';

import { type TableModel, type ModalController } from '../../model';

type ColumnSettingsProps = { model?: TableModel; modals: ModalController; onNewColumn: () => void };

export const ColumnSettings = ({ model, modals, onNewColumn }: ColumnSettingsProps) => {
  const [newField, setNewField] = useState<FieldType>();
  const state = modals.state.value;

  const space = model?.space;

  useEffect(() => {
    if (state?.type === 'columnSettings' && state.mode.type === 'create' && model?.projection) {
      setNewField(model.projectionManager.createFieldProjection());
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
        return model?.projection?.fields.find((f) => f.id === mode.fieldId);
      }
    }
    return undefined;
  }, [model?.projection?.fields, state]);

  const field = existingField ?? newField;

  const handleSave = useCallback(() => {
    modals.close();
  }, [modals]);

  const handleCancel = useCallback(() => {
    if (state?.type === 'columnSettings' && state.mode.type === 'create' && newField) {
      model?.projectionManager.deleteFieldProjection(newField.id);
    }
  }, [model?.projection, state, newField]);

  if (!model?.projectionManager || !model.projection || !field) {
    return null;
  }

  return (
    <Popover.Root modal={false} open={state?.type === 'columnSettings'}>
      <Popover.VirtualTrigger virtualRef={modals.trigger} />
      <Popover.Portal>
        <Popover.Content classNames='md:is-64'>
          <Popover.Viewport>
            <FieldEditor
              projection={model.projectionManager}
              field={field}
              registry={space?.db.schemaRegistry}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </Popover.Viewport>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

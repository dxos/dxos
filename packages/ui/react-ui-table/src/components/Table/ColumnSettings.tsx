//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { type Registry, type View } from '@dxos/echo';
import { FieldEditor } from '@dxos/react-ui-form/next';
import { Next } from '@dxos/react-ui/next';

import { type ModalController, type TableModel } from '../../model/index.ts';

type ColumnSettingsProps = {
  registry?: Registry.Registry;
  model?: TableModel;
  modals: ModalController;
  onNewColumn: () => void;
};

export const ColumnSettings = ({ registry, model, modals, onNewColumn }: ColumnSettingsProps) => {
  const [newField, setNewField] = useState<View.FieldType>();
  const state = useAtomValue(modals.state);

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
        return model?.projection?.getFields().find((f) => f.id === mode.fieldId);
      }
    }
    return undefined;
  }, [model?.projection, state]);

  const field = existingField ?? newField;

  const handleSave = useCallback(() => {
    modals.close();
  }, [modals]);

  const handleCancel = useCallback(() => {
    if (state?.type === 'columnSettings' && state.mode.type === 'create' && newField) {
      model?.projection.deleteFieldProjection(newField.id);
    }
  }, [model?.projection, state, newField]);

  if (!model?.projection || !field) {
    return null;
  }

  return (
    <Next.Popover.Root
      modal={false}
      open={state?.type === 'columnSettings'}
      positioning={Next.virtualAnchor(modals.trigger)}
    >
      <Next.Popover.Content classNames='md:w-64'>
        <Next.Popover.Body>
          <FieldEditor
            projection={model.projection}
            field={field}
            registry={registry}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </Next.Popover.Body>
      </Next.Popover.Content>
    </Next.Popover.Root>
  );
};

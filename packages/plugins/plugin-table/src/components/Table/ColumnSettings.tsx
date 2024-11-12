//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { DropdownMenu } from '@dxos/react-ui';
import { FieldEditor } from '@dxos/react-ui-data';
import { type FieldType } from '@dxos/schema';

import { type TableModel } from '../../model';

type ColumnSettingsProps = { model?: TableModel };

export const ColumnSettings = ({ model }: ColumnSettingsProps) => {
  const [newField, setNewField] = useState<FieldType>();
  const state = model?.modalController.state.value;

  useEffect(() => {
    if (state?.type === 'columnSettings' && state.mode.type === 'create' && model?.projection) {
      setNewField(model.projection.createFieldProjection());
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

  if (!model?.table?.view || !model.projection || !field) {
    return null;
  }

  return (
    <DropdownMenu.Root modal={false} open={state?.type === 'columnSettings'} onOpenChange={model.modalController.close}>
      <DropdownMenu.VirtualTrigger virtualRef={model.modalController.trigger} />
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Viewport>
            <FieldEditor
              view={model.table.view}
              projection={model.projection}
              field={field}
              onClose={() => model.modalController.close()}
            />
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

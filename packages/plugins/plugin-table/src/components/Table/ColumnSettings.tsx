//
// Copyright 2024 DXOS.org
//

import React, { type RefObject, useMemo, useEffect, useState } from 'react';

import { DropdownMenu, type DropdownMenuRootProps } from '@dxos/react-ui';
import { FieldEditor } from '@dxos/react-ui-data';
import { type FieldType } from '@dxos/schema';

import { type TableModel } from '../../model';
import { type ColumnSettingsMode } from '../hooks';

export type ColumnSettingsProps = {
  model?: TableModel;
  mode: ColumnSettingsMode;
  triggerRef: RefObject<HTMLButtonElement>;
} & Pick<DropdownMenuRootProps, 'open' | 'onOpenChange'>;

export const ColumnSettings = ({ model, mode, open, onOpenChange, triggerRef }: ColumnSettingsProps) => {
  const [newField, setNewField] = useState<FieldType>();

  useEffect(() => {
    if (mode.type === 'create' && model?.projection && open) {
      setNewField(model.projection.createFieldProjection());
    } else {
      setNewField(undefined);
    }
  }, [model?.projection, open, mode]);

  const existingField = useMemo(() => {
    return mode.type === 'edit' ? model?.table?.view?.fields.find((f) => f.property === mode.fieldId) : undefined;
  }, [model?.table?.view?.fields, mode]);

  const field = existingField ?? newField;
  if (!model?.table?.view || !model.projection || !field) {
    return null;
  }

  return (
    <DropdownMenu.Root modal={false} open={open} onOpenChange={onOpenChange}>
      <DropdownMenu.VirtualTrigger virtualRef={triggerRef} />
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Viewport>
            <FieldEditor
              view={model.table.view}
              projection={model.projection}
              field={field}
              onClose={() => onOpenChange?.(false)}
            />
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

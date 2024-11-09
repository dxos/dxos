//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { DropdownMenu, type DropdownMenuRootProps } from '@dxos/react-ui';
import { FieldEditor } from '@dxos/react-ui-data';
import { type FieldProjection } from '@dxos/schema';

import { type TableModel } from '../../model';

export type ColumnSettingsModalProps = {
  model?: TableModel;
  fieldId?: string;
  triggerRef: React.RefObject<HTMLButtonElement>;
} & Pick<DropdownMenuRootProps, 'open' | 'onOpenChange'>;

export const ColumnSettingsModal = ({ model, fieldId, open, onOpenChange, triggerRef }: ColumnSettingsModalProps) => {
  const field = useMemo(
    () => model?.table?.view?.fields.find((f) => f.property === fieldId),
    [model?.table?.view?.fields, fieldId],
  );

  const props = useMemo<FieldProjection | undefined>(() => {
    if (field) {
      return model?.projection.getFieldProjection(field.property);
    }
  }, [model?.projection, field]);

  if (!props || !field || !model?.projection || !model?.table?.view?.fields) {
    return null;
  }

  return (
    <DropdownMenu.Root modal={false} open={open} onOpenChange={onOpenChange}>
      <DropdownMenu.VirtualTrigger virtualRef={triggerRef} />
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Viewport>
            <FieldEditor
              view={model?.table.view}
              projection={model?.projection}
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

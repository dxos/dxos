//
// Copyright 2024 DXOS.org
//

import React, { type RefObject, useMemo } from 'react';

import { DropdownMenu, type DropdownMenuRootProps } from '@dxos/react-ui';
import { FieldEditor } from '@dxos/react-ui-data';
import { type FieldProjection } from '@dxos/schema';

import { type TableModel } from '../../model';

export type ColumnSettingsModalProps = {
  model?: TableModel;
  fieldId?: string;
  triggerRef: RefObject<HTMLButtonElement>;
} & Pick<DropdownMenuRootProps, 'open' | 'onOpenChange'>;

// TODO(burdon): Reconcile with ColumnCreate.
export const ColumnSettings = ({ model, open, fieldId, onOpenChange, triggerRef }: ColumnSettingsModalProps) => {
  const field = useMemo(
    () => model?.table?.view?.fields.find((f) => f.id === fieldId),
    [model?.table?.view?.fields, fieldId],
  );

  // TODO(burdon): Props are not used?
  const props = useMemo<FieldProjection | undefined>(() => {
    if (field) {
      return model?.projection.getFieldProjection(field.id);
    }
  }, [model?.projection, field]);

  if (!model?.table?.view?.fields || !field || !model?.projection || !props) {
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

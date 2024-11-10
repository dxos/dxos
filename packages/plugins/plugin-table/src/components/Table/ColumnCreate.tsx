//
// Copyright 2024 DXOS.org
//

import React, { type RefObject, useEffect, useState } from 'react';

import { DropdownMenu, type DropdownMenuRootProps } from '@dxos/react-ui';
import { FieldEditor } from '@dxos/react-ui-data';
import { type FieldType } from '@dxos/schema';

import { type TableModel } from '../../model';

export type ColumnCreateProps = {
  model?: TableModel;
  triggerRef: RefObject<HTMLButtonElement>;
} & Pick<DropdownMenuRootProps, 'open' | 'onOpenChange'>;

/**
 * @deprecated
 */
// TODO(burdon): Replace with ColumnSettings.
export const ColumnCreate = ({ model, open, onOpenChange, triggerRef }: ColumnCreateProps) => {
  const [field, setField] = useState<FieldType>();
  useEffect(() => {
    if (model?.projection && open) {
      setField(model.projection.createFieldProjection());
    } else {
      setField(undefined);
    }
  }, [model?.projection, open]);

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

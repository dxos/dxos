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
  columnId?: string; // TODO(burdon): Rename property?
  triggerRef: React.RefObject<HTMLButtonElement>;
} & Pick<DropdownMenuRootProps, 'open' | 'onOpenChange'>;

export const ColumnSettingsModal = ({ model, columnId, open, onOpenChange, triggerRef }: ColumnSettingsModalProps) => {
  const field = useMemo(
    () => model?.table?.view?.fields.find((f) => f.property === columnId),
    [model?.table?.view?.fields, columnId],
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
    <DropdownMenu.Root open={open} onOpenChange={onOpenChange}>
      <DropdownMenu.VirtualTrigger virtualRef={triggerRef} />
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <FieldEditor
            field={field}
            projection={model?.projection}
            view={model?.table.view}
            onComplete={() => onOpenChange?.(false)}
          />
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

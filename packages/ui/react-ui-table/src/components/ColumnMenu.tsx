//
// Copyright 2024 DXOS.org
//

import { X, GearSix, CaretDown, ArrowDown, ArrowUp } from '@phosphor-icons/react';
import { type SortDirection, type HeaderContext, type RowData } from '@tanstack/react-table';
import React, { useRef, useState, useCallback } from 'react';

import { Button, DensityProvider, Popover, DropdownMenu } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { ColumnSettingsForm } from './ColumnSettingsForm';
import { useColumnSorting } from './hooks/useColumnSorting';
import { type TableDef, type ColumnProps } from '../schema';

export type ColumnMenuProps<TData extends RowData, TValue> = {
  context: HeaderContext<TData, TValue>;
  tableDefs: TableDef[];
  tableDef: TableDef;
  column: ColumnProps;
  onUpdate?: (id: string, column: ColumnProps) => void;
  onDelete?: (id: string) => void;
};

export const ColumnMenu = <TData extends RowData, TValue>({ column, ...props }: ColumnMenuProps<TData, TValue>) => {
  const title = column.label?.length ? column.label : column.id;
  const header = props.context.header;

  const { canSort, sortDirection, onSelectSort, onToggleSort, onClearSort } = useColumnSorting(header.column);

  const columnSettingsAnchorRef = useRef<any>(null);

  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);

  const shouldPreventFocusOnClose = useRef(false);

  const onOpenColumnSettings = useCallback(() => {
    shouldPreventFocusOnClose.current = true;
    setIsColumnSettingsOpen(true);
  }, [shouldPreventFocusOnClose, setIsColumnSettingsOpen]); // setIsColumnSettingsOpen is a dependency

  const onDropdownCloseAutoFocus = useCallback(
    (event: Event) => {
      if (shouldPreventFocusOnClose.current) {
        event.preventDefault();
        shouldPreventFocusOnClose.current = false;
      }
    },
    [shouldPreventFocusOnClose],
  );

  return (
    <div className='flex items-center justify-center justify-between'>
      <div className='flex items-center gap-1 truncate' title={title}>
        <SortIndicator direction={sortDirection} onClick={onToggleSort} />
        <div className='truncate'>{title}</div>
      </div>

      <DropdownMenu.Root modal={false}>
        <Popover.Root open={isColumnSettingsOpen} onOpenChange={setIsColumnSettingsOpen} modal={false}>
          <DropdownMenu.Trigger ref={columnSettingsAnchorRef} asChild>
            <Popover.Anchor asChild>
              <Button variant='ghost'>
                <CaretDown className={getSize(4)} />
              </Button>
            </Popover.Anchor>
          </DropdownMenu.Trigger>

          <DropdownMenu.Content onCloseAutoFocus={onDropdownCloseAutoFocus} sideOffset={4} collisionPadding={8}>
            <DropdownMenu.Viewport>
              {canSort && (
                <>
                  <DropdownMenu.Item onClick={() => onSelectSort('asc')}>
                    <span className='grow'>Sort ascending</span>
                    <span className='opacity-50'>
                      <ArrowUp className={getSize(4)} />
                    </span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onClick={() => onSelectSort('desc')}>
                    <span className='grow'>Sort descending</span>
                    <span className='opacity-50'>
                      <ArrowDown className={getSize(4)} />
                    </span>
                  </DropdownMenu.Item>
                  {sortDirection !== false && (
                    <DropdownMenu.Item onClick={onClearSort}>
                      <span className='grow'>Clear sort</span>
                      <span className='opacity-50'>
                        <X className={getSize(4)} />
                      </span>
                    </DropdownMenu.Item>
                  )}
                </>
              )}
              <DropdownMenu.Item onClick={onOpenColumnSettings}>
                <span className='grow'>Column settings</span>
                <span className='opacity-50'>
                  <GearSix className={mx(getSize(4), 'rotate-90')} />
                </span>
              </DropdownMenu.Item>
            </DropdownMenu.Viewport>
            <DropdownMenu.Arrow />
          </DropdownMenu.Content>

          <ColumnSettingsPanel {...props} column={column} onClose={() => setIsColumnSettingsOpen(false)} />
        </Popover.Root>
      </DropdownMenu.Root>
    </div>
  );
};

export const ColumnSettingsPanel = <TData extends RowData, TValue>({
  tableDefs,
  tableDef,
  column,
  onUpdate,
  onDelete,
  onClose,
}: ColumnMenuProps<TData, TValue> & { onClose: () => void }) => (
  <Popover.Portal>
    <Popover.Content>
      <Popover.Viewport classNames='w-60'>
        <DensityProvider density='fine'>
          <ColumnSettingsForm
            column={column}
            tableDefs={tableDefs}
            tableDef={tableDef}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onClose={onClose}
          />
        </DensityProvider>
      </Popover.Viewport>
      <Popover.Arrow />
    </Popover.Content>
  </Popover.Portal>
);

export const SortIndicator = ({
  direction,
  onClick,
}: {
  direction: SortDirection | false;
  onClick: (e: any) => void;
}) => {
  if (direction === false) {
    return null;
  }

  let icon;

  switch (direction) {
    case 'asc':
      icon = <ArrowUp className={getSize(3)} />;
      break;
    case 'desc':
      icon = <ArrowDown className={getSize(3)} />;
      break;
  }

  return (
    <div onClick={onClick} className='flex items-center cursor-pointer'>
      {icon}
    </div>
  );
};

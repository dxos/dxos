//
// Copyright 2023 DXOS.org
//

import { X, GearSix, CaretDown, ArrowDown, ArrowUp } from '@phosphor-icons/react';
import { type SortDirection, type HeaderContext, type RowData } from '@tanstack/react-table';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

import { Button, DensityProvider, Popover, DropdownMenu } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

import { ColumnSettingsForm } from './ColumnSettingsForm';
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

  const canSort = header.column.getCanSort();
  const sortDirection = header.column.getIsSorted();
  const toggleSortingHandler = header.column.getToggleSortingHandler();
  const toggleSort = header.column.toggleSorting;
  const clearSort = header.column.clearSorting;

  const columnSettingsAnchorRef = useRef<any>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

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
        {toggleSortingHandler && <SortIndicator direction={sortDirection} onClick={toggleSortingHandler} />}
        <div className='truncate'>{title}</div>
      </div>
      {isMounted && (
        <ColumnSettingsPanel
          {...props}
          column={column}
          anchorNode={columnSettingsAnchorRef.current}
          open={isColumnSettingsOpen}
          setOpen={setIsColumnSettingsOpen}
        />
      )}

      <DropdownMenu.Root>
        <DropdownMenu.Trigger ref={columnSettingsAnchorRef}>
          <Button variant='ghost'>
            <CaretDown className={getSize(4)} />
          </Button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content onCloseAutoFocus={onDropdownCloseAutoFocus} sideOffset={4} collisionPadding={8}>
          <DropdownMenu.Viewport>
            {canSort && toggleSort && (
              <>
                <DropdownMenu.Item onClick={() => toggleSort(false)}>
                  <span className='grow'>Sort ascending</span>
                  <span className='opacity-50'>
                    <ArrowUp className={getSize(4)} />
                  </span>
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => toggleSort(true)}>
                  <span className='grow'>Sort descending</span>
                  <span className='opacity-50'>
                    <ArrowDown className={getSize(4)} />
                  </span>
                </DropdownMenu.Item>
                {sortDirection !== false && (
                  <DropdownMenu.Item onClick={clearSort}>
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
      </DropdownMenu.Root>
    </div>
  );
};

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

export const ColumnSettingsPanel = <TData extends RowData, TValue>({
  tableDefs,
  tableDef,
  column,
  onUpdate,
  onDelete,
  anchorNode,
  open,
  setOpen,
}: ColumnMenuProps<TData, TValue> & { anchorNode: any; open: boolean; setOpen: (b: boolean) => void }) => {
  return (
    <Popover.Root open={open} onOpenChange={(o) => setOpen(o)}>
      {createPortal(<Popover.Anchor />, anchorNode)}
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
                onClose={() => setOpen(false)}
              />
            </DensityProvider>
          </Popover.Viewport>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

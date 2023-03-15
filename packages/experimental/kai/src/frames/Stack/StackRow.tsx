//
// Copyright 2022 DXOS.org
//

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Article,
  CaretCircleDown,
  DotsSixVertical,
  Image,
  ListChecks,
  Table as TableIcon,
  Trash
} from '@phosphor-icons/react';
import React, { FC, ForwardedRef, forwardRef, ReactNode, useState } from 'react';

import { EchoSchemaType } from '@dxos/echo-schema';
import { Document, File, Table, TaskList } from '@dxos/kai-types';
import {
  Button,
  Dialog,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  getSize,
  mx
} from '@dxos/react-components';

import { FileList } from '../File';

export type StackRowProps = {
  style?: any;
  dragging?: boolean;
  dragAttributes?: any;
  children?: ReactNode;
  Handle?: JSX.Element;
  className?: string;
  showMenu?: boolean;
  onCreate?: (type: EchoSchemaType, objectId?: string) => void;
  onDelete?: () => void;
};

export const StackRow = forwardRef(
  (
    { children, Handle, dragging, style, dragAttributes, showMenu, className, onCreate, onDelete }: StackRowProps,
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [fileDialogVisible, setFileDialogVisible] = useState(false);
    const types: ContextMenuItem[] = onCreate
      ? [
          {
            type: Document.type,
            label: 'Text',
            Icon: Article
          },
          {
            type: TaskList.type,
            label: 'Task list',
            Icon: ListChecks
          },
          {
            type: Table.type,
            label: 'Table',
            Icon: TableIcon
          },
          {
            type: File.type,
            label: 'Image',
            Icon: Image,
            onAction: () => setFileDialogVisible(true)
          }
        ]
      : [];

    return (
      <div
        ref={ref}
        style={style}
        className={mx('group flex overflow-hidden mx-6 md:mx-0', dragging && 'relative z-10 bg-zinc-100', className)}
      >
        <div className='md:flex shink-0 w-24 text-gray-400'>
          {showMenu && (
            <>
              <div className={mx('flex invisible group-hover:visible ml-6 -mt-0.5', menuOpen && 'visible')}>
                <div className='w-8'>
                  {!dragging && (
                    <ContextMenu types={types} onOpenChange={setMenuOpen} onCreate={onCreate} onDelete={onDelete} />
                  )}
                </div>
                {Handle}
              </div>

              {/* TODO(burdon): Generalize pickers. */}
              {fileDialogVisible && (
                <Dialog title='Select image' open={fileDialogVisible}>
                  {/* TODO(burdon): Filter by image. */}
                  <div className='mt-4'>
                    <FileList
                      disableDownload
                      onSelect={(objectId) => {
                        setFileDialogVisible(false);
                        onCreate?.(File.type, objectId);
                      }}
                    />
                  </div>
                  <div className='flex flex-row-reverse'>
                    <Button variant='primary' onClick={() => setFileDialogVisible(false)}>
                      Cancel
                    </Button>
                  </div>
                </Dialog>
              )}
            </>
          )}
        </div>

        <div className='flex flex-col flex-1 overflow-hidden mr-2 md:mr-16'>{children}</div>
      </div>
    );
  }
);

export const SortableStackRow: FC<StackRowProps & { id: string }> = ({ id, ...rest }) => {
  // https://docs.dndkit.com/presets/sortable/usesortable
  const { isDragging, attributes, listeners, transform, transition, setNodeRef } = useSortable({ id });
  const t = transform ? Object.assign(transform, { scaleY: 1 }) : null;

  const Handle = (
    <div className='p-1 cursor-pointer'>
      <button {...attributes} {...listeners}>
        <DotsSixVertical className={getSize(6)} />
      </button>
    </div>
  );

  return (
    <StackRow
      ref={setNodeRef}
      dragging={isDragging}
      Handle={Handle}
      style={{ transform: CSS.Transform.toString(t), transition }}
      {...rest}
    />
  );
};

type ContextMenuItem = {
  type: EchoSchemaType;
  label: string;
  Icon: FC<any>;
  onAction?: () => void;
};

type ContextMenuProps = {
  types: ContextMenuItem[];
  onOpenChange: (open: boolean) => void;
} & Pick<StackRowProps, 'onCreate' | 'onDelete'>;

const ContextMenu = ({ types, onOpenChange, onCreate, onDelete }: ContextMenuProps) => {
  return (
    <DropdownMenu
      slots={{ root: { onOpenChange }, content: { className: 'z-50' } }}
      trigger={
        <Button variant='ghost' className='p-1'>
          <CaretCircleDown className={getSize(6)} />
        </Button>
      }
    >
      {onCreate && (
        <>
          {types.map(({ type, label, Icon, onAction }) => (
            <DropdownMenuItem key={type.name} onClick={() => (onAction ? onAction() : onCreate(type))}>
              <Icon className={getSize(5)} />
              <span className='mis-2'>{label}</span>
            </DropdownMenuItem>
          ))}
        </>
      )}

      {onDelete && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete}>
            <Trash className={getSize(5)} />
            <span className='mis-2'>Remove block</span>
          </DropdownMenuItem>
        </>
      )}
    </DropdownMenu>
  );
};

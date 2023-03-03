//
// Copyright 2022 DXOS.org
//

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CaretCircleDown,
  DotsSixVertical,
  Image,
  ListBullets,
  Table as TableIcon,
  TextAlignLeft,
  Trash
} from 'phosphor-react';
import React, { FC, ForwardedRef, forwardRef, ReactNode, useState } from 'react';

import { EchoSchemaType } from '@dxos/echo-schema';
import {
  Button,
  Dialog,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  getSize,
  mx
} from '@dxos/react-components';

import { Document, File, Table, TaskList } from '../../proto';
import { FileList } from '../File';

type StackRowProps = {
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

// TODO(burdon): Remove transparency while dragging.
export const StackRow = forwardRef(
  (
    { children, Handle, dragging, style, dragAttributes, showMenu, className, onCreate, onDelete }: StackRowProps,
    ref: ForwardedRef<HTMLDivElement>
  ) => {
    const [fileDialogVisible, setFileDialogVisible] = useState(false);

    return (
      <div
        ref={ref}
        style={style}
        className={mx('group flex mx-6 md:mx-0', dragging && 'relative z-10 bg-zinc-100', className)}
      >
        <div className='hidden md:flex w-24 text-gray-400'>
          {showMenu && (
            <div className='flex invisible group-hover:visible ml-6 -mt-0.5'>
              <div className='w-8'>
                {!dragging && (
                  <DropdownMenu
                    trigger={
                      <Button variant='ghost' className='p-1'>
                        <CaretCircleDown className={getSize(6)} />
                      </Button>
                    }
                    slots={{ content: { className: 'z-50' } }}
                  >
                    {onCreate && (
                      <>
                        {/* TODO(burdon): Factor out options (and renderers). */}
                        <DropdownMenuItem onClick={() => onCreate(Document.type)}>
                          <TextAlignLeft className={getSize(5)} />
                          <span className='mis-2'>Text</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onCreate(TaskList.type)}>
                          <ListBullets className={getSize(5)} />
                          <span className='mis-2'>Tasks</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onCreate(Table.type)}>
                          <TableIcon className={getSize(5)} />
                          <span className='mis-2'>Table</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFileDialogVisible(true)}>
                          <Image className={getSize(5)} />
                          <span className='mis-2'>Image</span>
                        </DropdownMenuItem>
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
                )}
              </div>

              {Handle}
            </div>
          )}

          {/* TODO(burdon): Generalize pickers. */}
          {fileDialogVisible && (
            <Dialog title='Select image' open={fileDialogVisible}>
              {/* TODO(burdon): Filter by image. */}
              {/* TODO(burdon): Standardize dialogs. */}
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
        </div>

        <div className='flex flex-col flex-1 mr-2 md:mr-16'>{children}</div>
      </div>
    );
  }
);

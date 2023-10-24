//
// Copyright 2023 DXOS.org
//

import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, Plus, DotsSixVertical } from '@phosphor-icons/react';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import React, {
  type ChangeEvent,
  type ComponentPropsWithoutRef,
  forwardRef,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
} from 'react';

import {
  Button,
  Input as NaturalInput,
  useTranslation,
  type ButtonProps,
  type Density,
  DensityProvider,
  List,
  ListItem,
  type ListItemRootProps,
  type ListScopedProps,
  useListContext,
  LIST_NAME,
  useDensityContext,
} from '@dxos/react-ui';
import { mx, getSize, descriptionText } from '@dxos/react-ui-theme';

import { Input, type InputProps } from '../Input';
import { Tooltip } from '../Tooltip';

export interface EditableListItemSlots {
  root?: { className?: string };
  selectableCheckbox?: { className?: string };
  input?: InputProps['slots'];
}

export type EditableListItemProps = ListItemRootProps & {
  id: string;
  defaultCompleted?: boolean;
  completed?: boolean;
  onChangeCompleted?: (completed: boolean) => void;
  defaultTitle?: string;
  title?: string;
  onChangeTitle?: (event: ChangeEvent<HTMLInputElement>) => void;
  onClickDelete?: () => void;
  slots?: EditableListItemSlots;
};

export interface EditableListSlots {
  root?: Omit<ComponentPropsWithoutRef<'div'>, 'children'>;
  listHeading?: InputProps['slots'];
  list?: { className?: string };
  addItemInput?: InputProps['slots'];
  addItemButton?: ButtonProps;
}

export interface EditableListProps {
  id: string;
  labelId: string;
  completable?: boolean;
  variant?: 'ordered-draggable' | 'unordered';
  onClickAdd?: () => void;
  defaultNextItemTitle?: string;
  nextItemTitle?: string;
  onChangeNextItemTitle?: (event: ChangeEvent<HTMLInputElement>) => void;
  defaultItemIdOrder?: string[];
  itemIdOrder?: string[];
  onMoveItem?: (oldIndex: number, newIndex: number) => void;
  children?: ReactNode;
  slots?: EditableListSlots;
  density?: Density;
}

const focusAndSetCaretPosition = (prevEl: HTMLInputElement, nextEl: HTMLInputElement) => {
  const pos = prevEl.selectionStart ?? 0;
  if ('selectionStart' in nextEl) {
    nextEl.focus();
    nextEl.setSelectionRange(pos, pos);
  } else {
    (nextEl as HTMLInputElement).focus();
  }
};

export const useEditableListKeyboardInteractions = (hostId: string) => {
  const hostAttrs = { 'data-focus-series-host': hostId };
  const itemAttrs = { 'data-focus-series': 'editableList' };
  const onListItemInputKeyDown = useCallback(
    (event: KeyboardEvent<Element>) => {
      const inputsInScope = Array.from(
        document.querySelectorAll<HTMLInputElement>(
          `[data-focus-series-host="${hostId}"] [data-focus-series="editableList"]`,
        ),
      );
      const targetIndex = inputsInScope.findIndex((sibling) => sibling === event.target);
      switch (event.key) {
        case 'Enter':
        case 'PageDown': {
          if (targetIndex < inputsInScope.length - 1) {
            event.preventDefault();
            focusAndSetCaretPosition(event.target as HTMLInputElement, inputsInScope[targetIndex + 1]);
          }
          break;
        }
        case 'PageUp': {
          if (targetIndex > 0) {
            event.preventDefault();
            focusAndSetCaretPosition(event.target as HTMLInputElement, inputsInScope[targetIndex - 1]);
          }
          break;
        }
      }
    },
    [hostId],
  );

  return { onListItemInputKeyDown, hostAttrs, itemAttrs };
};

export const EditableList = ({
  children,
  completable,
  variant = 'ordered-draggable',
  onClickAdd,
  nextItemTitle,
  defaultNextItemTitle,
  onChangeNextItemTitle,
  itemIdOrder,
  onMoveItem,
  density: propsDensity,
  slots = {},
}: EditableListProps) => {
  const { t } = useTranslation('appkit');
  const density = useDensityContext(propsDensity);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (itemIdOrder && over?.id && active.id !== over?.id) {
      const oldIndex = itemIdOrder.findIndex((id) => id === active.id);
      const newIndex = itemIdOrder.findIndex((id) => id === over.id);
      onMoveItem?.(oldIndex, newIndex);
    }
  };

  const listContent = (
    <List variant={variant === 'ordered-draggable' ? 'ordered' : 'unordered'} selectable={completable}>
      {children}
    </List>
  );

  return (
    <div role='none' {...slots.root} className={mx('contents', slots.root?.className)}>
      {variant === 'ordered-draggable' ? (
        <DndContext onDragEnd={handleDragEnd}>
          <SortableContext items={itemIdOrder!}>{listContent}</SortableContext>
        </DndContext>
      ) : (
        listContent
      )}
      <div className='flex'>
        <DensityProvider density={density}>
          {variant === 'ordered-draggable' && <ListItem.Endcap classNames='is-5 invisible' />}
          {completable && <ListItem.Endcap classNames='invisible' />}
          <Input
            variant='subdued'
            label={t('new list item input label')}
            labelVisuallyHidden
            placeholder={t('new list item input placeholder')}
            {...{
              value: nextItemTitle,
              defaultValue: defaultNextItemTitle,
              onChange: onChangeNextItemTitle,
            }}
            slots={{
              ...slots.addItemInput,
              root: {
                ...slots.addItemInput?.root,
                className: mx('grow', slots.addItemInput?.root?.className),
              },
            }}
          />
          <ListItem.Endcap>
            <Tooltip
              content={
                <>
                  <span className='mie-2'>{t('add list item label')}</span>
                  <span className={descriptionText}>⏎</span>
                </>
              }
              side='left'
              tooltipLabelsTrigger
            >
              <Button
                variant='ghost'
                {...slots.addItemButton}
                classNames={['p-1', slots.addItemButton?.classNames]}
                onClick={onClickAdd}
              >
                <Plus className={getSize(4)} />
              </Button>
            </Tooltip>
          </ListItem.Endcap>
        </DensityProvider>
      </div>
    </div>
  );
};

export const EditableListItem = forwardRef<HTMLLIElement, ListScopedProps<EditableListItemProps>>(
  (
    {
      __listScope,
      id,
      defaultCompleted,
      completed,
      onChangeCompleted,
      defaultTitle,
      title,
      onChangeTitle,
      onClickDelete,
      slots = {},
    },
    forwardedRef,
  ) => {
    const { t } = useTranslation('appkit');
    const { variant, selectable } = useListContext(LIST_NAME, __listScope);
    const { attributes, listeners, setNodeRef, transform } = useSortable({ id });
    const ref = useComposedRefs(setNodeRef, forwardedRef) as ListItemRootProps['ref'];
    return (
      <ListItem.Root
        ref={ref}
        {...{
          id,
          defaultSelected: defaultCompleted,
          selected: completed,
          onSelectedChange: onChangeCompleted,
        }}
        style={{ transform: CSS.Translate.toString(transform) }}
      >
        {variant === 'ordered' && (
          <ListItem.Endcap classNames='items-center is-5' {...attributes} {...listeners}>
            <DotsSixVertical className={getSize(5)} />
          </ListItem.Endcap>
        )}
        {selectable && (
          <ListItem.Endcap classNames='items-center'>
            <NaturalInput.Root id={`${id}__checkbox`}>
              <NaturalInput.Checkbox
                classNames={slots?.selectableCheckbox?.className}
                checked={completed}
                defaultChecked={defaultCompleted}
                onCheckedChange={onChangeCompleted}
              />
            </NaturalInput.Root>
          </ListItem.Endcap>
        )}
        <ListItem.Heading classNames='sr-only'>{title}</ListItem.Heading>
        <Input
          {...{
            variant: 'subdued',
            label: t('list item input label'),
            labelVisuallyHidden: true,
            placeholder: t('list item input placeholder'),
            slots: {
              ...slots.input,
              root: {
                ...slots.input?.root,
                className: mx('grow', slots.input?.root?.className),
              },
            },
            value: title,
            defaultValue: defaultTitle,
            onChange: onChangeTitle,
          }}
        >
          {title ?? defaultTitle}
        </Input>
        {onClickDelete && (
          <ListItem.Endcap>
            <Tooltip content={t('delete list item label')} side='left' tooltipLabelsTrigger>
              <Button variant='ghost' classNames='p-1' onClick={onClickDelete}>
                <X className={getSize(4)} />
              </Button>
            </Tooltip>
          </ListItem.Endcap>
        )}
      </ListItem.Root>
    );
  },
);

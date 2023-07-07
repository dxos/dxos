//
// Copyright 2023 DXOS.org
//

import { DragEndEvent, DraggableAttributes } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DotsSixVertical, Minus, Placeholder, Plus } from '@phosphor-icons/react';
import get from 'lodash.get';
import React, { forwardRef, useCallback, useEffect, useState } from 'react';

import { useDragEnd, useDragOver, useDragStart } from '@braneframe/plugin-dnd';
import { useSplitView } from '@braneframe/plugin-splitview';
import {
  Main,
  Input,
  List,
  ListItem,
  Button,
  useTranslation,
  DensityProvider,
  ListScopedProps,
  DropdownMenu,
  ButtonGroup,
  ListItemRootProps,
} from '@dxos/aurora';
import { buttonFine, defaultBlockSeparator, defaultFocus, getSize, mx, surfaceElevation } from '@dxos/aurora-theme';
import { subscribe } from '@dxos/observable-object';
import { useSubscription } from '@dxos/observable-object/react';
import { Surface } from '@dxos/react-surface';
import { arrayMove } from '@dxos/util';

import { stackSectionChoosers, stackSectionCreators } from '../StackPlugin';
import { GenericStackObject, StackModel, StackProperties, StackSectionModel, StackSections } from '../props';

type StackSectionProps = {
  onRemove: () => void;
  section: StackSectionModel;
};

export const StackSectionOverlay = ({ data }: { data: StackSectionModel }) => {
  return (
    <List variant='ordered'>
      <StackSectionImpl onRemove={() => {}} section={data} isOverlay />
    </List>
  );
};

const StackSectionImpl = forwardRef<
  HTMLLIElement,
  ListScopedProps<StackSectionProps> & {
    draggableAttributes?: DraggableAttributes;
    draggableListeners?: ReturnType<typeof useSortable>['listeners'];
    style?: ListItemRootProps['style'];
    rearranging?: boolean;
    isOverlay?: boolean;
  }
>(({ onRemove, section, draggableAttributes, draggableListeners, style, rearranging, isOverlay }, forwardedRef) => {
  const { t } = useTranslation('dxos:stack');
  return (
    <DensityProvider density='fine'>
      <ListItem.Root
        id={section.object.id}
        classNames={[
          surfaceElevation({ elevation: 'group' }),
          'bg-white dark:bg-neutral-925 grow rounded mbe-2',
          '[--controls-opacity:1] hover-hover:[--controls-opacity:.1] hover-hover:hover:[--controls-opacity:1]',
          isOverlay && 'hover-hover:[--controls-opacity:1]',
          rearranging && 'invisible',
        ]}
        ref={forwardedRef}
        style={style}
      >
        <ListItem.Heading classNames='sr-only'>
          {get(section, 'object.title', t('generic section heading'))}
        </ListItem.Heading>
        <div
          className={mx(
            buttonFine,
            defaultFocus,
            'self-stretch flex items-center rounded-is justify-center bs-auto is-auto focus-visible:[--controls-opacity:1]',
            isOverlay && 'text-primary-600 dark:text-primary-300',
          )}
          {...draggableAttributes}
          {...draggableListeners}
        >
          <DotsSixVertical
            weight={isOverlay ? 'bold' : 'regular'}
            className={mx(getSize(5), 'transition-opacity opacity-[--controls-opacity]')}
          />
        </div>
        <div role='none' className='flex-1'>
          <Surface role='section' data={section} />
        </div>
        <Button
          variant='ghost'
          classNames='self-stretch justify-start rounded-is-none focus:[--controls-opacity:1]'
          onClick={onRemove}
        >
          <span className='sr-only'>{t('remove section label')}</span>
          <Minus className={mx(getSize(4), 'transition-opacity opacity-[--controls-opacity]')} />
        </Button>
      </ListItem.Root>
    </DensityProvider>
  );
});

const StackSection = (props: ListScopedProps<StackSectionProps> & { rearranging?: boolean }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: props.section.object.id,
    data: { entity: props.section },
  });
  return (
    <StackSectionImpl
      {...props}
      draggableListeners={listeners}
      draggableAttributes={attributes}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      ref={setNodeRef}
    />
  );
};

// todo(thure): `observer` causes infinite rerenders if used here.
const StackMainImpl = ({ sections }: { sections: StackSections }) => {
  const [iter, setIter] = useState([]);
  const { t } = useTranslation('dxos:stack');
  const splitView = useSplitView();

  // todo(thure): Is there a hook that is compatible with both `ObservedArray`s and `TypedObject`s?
  if (subscribe in sections) {
    useEffect(() => {
      // todo(thure): TypeScript seems to get the wrong return value from `ObservableArray.subscribe`
      return sections[subscribe](() => setIter([])) as () => void;
    }, []);
  } else {
    useSubscription(() => setIter([]), [sections]);
  }

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overIsMember, setOverIsMember] = useState(false);

  useDragStart(({ active: { id } }) => setActiveId(id.toString()), []);

  useDragOver(
    ({ over }) => {
      if (!over) {
        return setOverIsMember(false);
      }
      const index = sections.findIndex((section) => section.object.id === over.id);
      return setOverIsMember(index >= 0);
    },
    [iter, sections],
  );

  const handleAdd = useCallback(
    (start: number, nextSectionObject: GenericStackObject) => {
      const section: StackSectionModel = {
        object: nextSectionObject,
      };
      sections.splice(start, 0, section);
    },
    [sections],
  );

  const handleRemove = useCallback(
    (start: number) => {
      sections.splice(start, 1);
    },
    [sections],
  );

  useDragEnd((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((section) => section.object.id === active.id);
      const newIndex = sections.findIndex((section) => section.object.id === over?.id);
      arrayMove(sections, oldIndex, newIndex);
    }
    setActiveId(null);
  }, []);

  return (
    <>
      <List variant='ordered' itemSizes='many' classNames='pis-1 pie-2'>
        <SortableContext
          items={Array.from(sections)
            // todo(thure): DRY-out this filter, also should this be represented in the UI?
            .filter((section) => !!section?.object?.id)
            .map(({ object: { id } }) => id)}
          strategy={verticalListSortingStrategy}
        >
          {sections
            .filter((section) => !!section?.object?.id)
            .map((section, start) => {
              return (
                <StackSection
                  key={section.object.id}
                  onRemove={() => handleRemove(start)}
                  section={section}
                  rearranging={overIsMember && activeId === section.object.id}
                />
              );
            })}
        </SortableContext>
      </List>
      <div role='none' className='flex gap-4 justify-center items-center'>
        <h2 className='text-sm font-normal flex items-center gap-1'>
          <Plus className={getSize(4)} />
          <span>{t('add section label')}</span>
        </h2>
        <ButtonGroup classNames={[surfaceElevation({ elevation: 'group' }), 'bg-white dark:bg-neutral-925']}>
          <DropdownMenu.Root modal={false}>
            <DropdownMenu.Trigger asChild>
              <Button variant='ghost'>
                <span>{t('add new section label')}</span>
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Arrow />
              {stackSectionCreators.map(({ id, testId, create, icon, label }) => {
                const Icon = icon ?? Placeholder;
                return (
                  <DropdownMenu.Item
                    key={id}
                    id={id}
                    data-testid={testId}
                    onClick={() => {
                      const nextSection = create();
                      handleAdd(sections.length, nextSection);
                    }}
                  >
                    <Icon className={getSize(4)} />
                    <span>{typeof label === 'string' ? label : t(...label)}</span>
                  </DropdownMenu.Item>
                );
              })}
            </DropdownMenu.Content>
          </DropdownMenu.Root>

          <DropdownMenu.Root modal={false}>
            <DropdownMenu.Trigger asChild>
              <Button variant='ghost'>
                <span>{t('add existing section label')}</span>
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Arrow />
              {stackSectionChoosers.map(({ id, testId, icon, label }) => {
                const Icon = icon ?? Placeholder;
                return (
                  <DropdownMenu.Item
                    key={id}
                    id={id}
                    data-testid={testId}
                    onClick={() => {
                      splitView.dialogContent = {
                        id,
                        chooser: 'many',
                        subject: 'dxos:stack/chooser',
                        omit: new Set(
                          sections.filter((section) => !!section?.object?.id).map(({ object: { id } }) => id),
                        ),
                        onDone: (items: GenericStackObject[]) =>
                          sections.splice(sections.length, 0, ...items.map((item) => ({ object: item }))),
                      };
                      splitView.dialogOpen = true;
                    }}
                  >
                    <Icon className={getSize(4)} />
                    <span>{typeof label === 'string' ? label : t(...label)}</span>
                  </DropdownMenu.Item>
                );
              })}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </ButtonGroup>
      </div>
    </>
  );
};

export const StackMain = ({ data }: { data: [unknown, StackModel & StackProperties] }) => {
  const stack = data[data.length - 1] as StackModel & StackProperties;
  const { t } = useTranslation('dxos:stack');
  return (
    <Main.Content classNames='min-bs-[100vh] mli-auto max-is-[60rem]'>
      <Input.Root>
        <Input.Label srOnly>{t('stack title label')}</Input.Label>
        <Input.TextInput
          variant='subdued'
          classNames='flex-1 min-is-0 is-auto pis-2 plb-3.5 pointer-fine:plb-2.5'
          placeholder={t('stack title placeholder')}
          defaultValue={stack.title ?? ''}
          onChange={({ target: { value } }) => (stack.title = value)}
        />
      </Input.Root>
      <div role='separator' className={mx(defaultBlockSeparator, 'mli-3 mbe-2 opacity-50')} />
      <StackMainImpl sections={stack.sections} />
    </Main.Content>
  );
};

//
// Copyright 2023 DXOS.org
//

import { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DotsSixVertical, Minus, Placeholder, Plus } from '@phosphor-icons/react';
import get from 'lodash.get';
import React, { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';

import { useDnd, useDragEnd, useDragOver, useDragStart, SortableProps } from '@braneframe/plugin-dnd';
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
} from '@dxos/aurora';
import { buttonFine, defaultBlockSeparator, defaultFocus, getSize, mx, surfaceElevation } from '@dxos/aurora-theme';
import { subscribe } from '@dxos/observable-object';
import { useSubscription } from '@dxos/observable-object/react';
import { Surface } from '@dxos/react-surface';
import { arrayMove } from '@dxos/util';

import { GenericStackObject, StackModel, StackProperties, StackSectionModel, StackSections } from '../props';
import { stackSectionChoosers, stackSectionCreators } from '../stores';

type StackSectionProps = {
  onRemove?: () => void;
  section: StackSectionModel;
};

export const StackSectionOverlay = ({ data }: { data: StackSectionModel }) => {
  return (
    <List variant='ordered'>
      <StackSectionImpl section={data} isOverlay />
    </List>
  );
};

const StackSectionImpl = forwardRef<HTMLLIElement, ListScopedProps<StackSectionProps> & SortableProps>(
  (
    { onRemove = () => {}, section, draggableAttributes, draggableListeners, style, rearranging, isOverlay },
    forwardedRef,
  ) => {
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
            rearranging ? 'opacity-0' : section.isPreview ? 'opacity-50' : 'opacity-100',
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
  },
);

const StackSection = (props: ListScopedProps<StackSectionProps> & { rearranging?: boolean }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: props.section.id,
    data: { section: props.section, dragoverlay: props.section },
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

const getSectionModels = (sections: StackSections): StackSectionModel[] =>
  Array.from(sections)
    .filter((section) => section?.object?.id)
    .map(({ object }) => getSectionModel(object));

const getSectionModel = (object: GenericStackObject, isPreview?: boolean): StackSectionModel => ({
  id: object.id,
  object,
  isPreview: !!isPreview,
});

// todo(thure): `observer` causes infinite rerenders if used here.
const StackMainImpl = ({
  sections,
  onAdd,
}: {
  sections: StackSections;
  onAdd: (start: number, nextSectionObject: GenericStackObject) => StackSectionModel[];
}) => {
  const [_, setIter] = useState([]);
  const dnd = useDnd();
  const sectionIds = useMemo(() => new Set(Array.from(sections).map(({ object: { id } }) => id)), [sections]);

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
  const [activeAddableObject, setActiveAddableObject] = useState<GenericStackObject | null>(null);
  const [overIsMember, setOverIsMember] = useState(false);

  const [sectionModels, setSectionModels] = useState(getSectionModels(sections));

  useDragStart(
    ({ active: { data } }: DragStartEvent) => {
      const nextActiveId = get(data.current, 'section.object.id', null);
      if (nextActiveId) {
        setActiveId(nextActiveId);
        setActiveAddableObject(null);
      } else {
        const chooserDatum = get(data.current, 'treeitem.data', null);
        const validChooser = chooserDatum && stackSectionChoosers.find((chooser) => chooser?.filter(chooserDatum));
        setActiveAddableObject(validChooser && !sectionIds.has(get(chooserDatum, 'id')) ? chooserDatum : null);
      }
    },
    [sectionIds],
  );

  useDragOver(
    ({ over }: DragOverEvent) => {
      if (!over) {
        setOverIsMember(false);
      } else {
        const overId = get(over, 'data.current.section.object.id', null);
        const overIndex = sections.findIndex((section) => section?.object?.id === overId);
        setOverIsMember(overIndex >= 0);
        if (activeAddableObject) {
          setSectionModels((sectionModels) => {
            if (overIndex >= 0) {
              const persistedObjects = getSectionModels(sections);
              return [
                ...persistedObjects.slice(0, overIndex),
                { id: activeAddableObject.id, object: activeAddableObject, isPreview: true },
                ...persistedObjects.slice(overIndex, persistedObjects.length),
              ];
            } else if (overId !== activeAddableObject.id && sectionModels.length !== sections.length) {
              return getSectionModels(sections);
            } else {
              return sectionModels;
            }
          });
        }
      }
    },
    [sections, activeAddableObject],
  );

  const handleRemove = useCallback(
    (start: number) => {
      sections.splice(start, 1);
      setSectionModels(getSectionModels(sections));
    },
    [sections],
  );

  useDragEnd(
    ({ active, over }: DragEndEvent) => {
      console.log('[drag end]', overIsMember, activeAddableObject);
      const activeModelIndex = sectionModels.findIndex(({ id }) => id === activeAddableObject?.id);
      if (activeModelIndex >= 0) {
        dnd.overlayDropAnimation = 'into';
        setSectionModels(onAdd(activeModelIndex, activeAddableObject!));
      } else if (overIsMember) {
        const overSectionId = get(over, 'data.current.section.object.id');
        const activeSectionId = get(active, 'data.current.section.object.id', null);
        const nextIndex = sections.findIndex((section) => section.object.id === over?.id);
        if (activeSectionId) {
          dnd.overlayDropAnimation = 'around';
          if (activeSectionId !== overSectionId) {
            const activeIndex = sections.findIndex((section) => section.object.id === active.id);
            arrayMove(sections, activeIndex, nextIndex);
            setSectionModels(getSectionModels(sections));
          }
        }
      } else {
        setSectionModels(getSectionModels(sections));
      }
      setActiveId(null);
      setActiveAddableObject(null);
      setOverIsMember(false);
    },
    [sections, overIsMember, activeAddableObject, sectionModels],
  );

  return (
    <List variant='ordered' itemSizes='many' classNames='pli-2'>
      <SortableContext items={sectionModels} strategy={verticalListSortingStrategy}>
        {sectionModels.map((sectionModel, start) => {
          return (
            <StackSection
              key={sectionModel.id}
              onRemove={() => handleRemove(start)}
              section={sectionModel}
              rearranging={overIsMember && activeId === sectionModel.id}
            />
          );
        })}
      </SortableContext>
    </List>
  );
};

export const StackMain = ({ data }: { data: [unknown, StackModel & StackProperties] }) => {
  const stack = data[data.length - 1] as StackModel & StackProperties;
  const { t } = useTranslation('dxos:stack');
  const splitView = useSplitView();
  const handleAdd = useCallback(
    (start: number, nextSectionObject: GenericStackObject) => {
      const nextSectionModel = getSectionModel(nextSectionObject);
      stack.sections.splice(start, 0, nextSectionModel);
      console.log('[handle add]', getSectionModels(stack.sections));
      return getSectionModels(stack.sections);
    },
    [stack.sections],
  );
  return (
    <Main.Content classNames='min-bs-[100vh]'>
      <div role='none' className='mli-auto max-is-[60rem]'>
        <Input.Root>
          <Input.Label srOnly>{t('stack title label')}</Input.Label>
          <Input.TextInput
            variant='subdued'
            classNames='flex-1 min-is-0 is-auto pis-4 pointer-fine:pis-12 lg:pis-4 pointer-fine:lg:pis-4 plb-3.5 pointer-fine:plb-2.5'
            placeholder={t('stack title placeholder')}
            defaultValue={stack.title ?? ''}
            onChange={({ target: { value } }) => (stack.title = value)}
          />
        </Input.Root>
        <div role='separator' className={mx(defaultBlockSeparator, 'mli-4 mbe-2 opacity-50')} />
        <StackMainImpl key={stack.id} sections={stack.sections} onAdd={handleAdd} />
        <div role='none' className='flex gap-4 justify-center items-center pbs-2 pbe-4'>
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
                        handleAdd(stack.sections.length, nextSection);
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
                            stack.sections.filter((section) => !!section?.object?.id).map(({ object: { id } }) => id),
                          ),
                          onDone: (items: GenericStackObject[]) =>
                            stack.sections.splice(
                              stack.sections.length,
                              0,
                              ...items.map((item) => getSectionModel(item)),
                            ),
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
      </div>
    </Main.Content>
  );
};

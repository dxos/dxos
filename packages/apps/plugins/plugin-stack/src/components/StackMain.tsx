//
// Copyright 2023 DXOS.org
//

import { DotsSixVertical, Minus, Placeholder, Plus } from '@phosphor-icons/react';
import get from 'lodash.get';
import React, { useCallback, useEffect, useState } from 'react';

import { useSplitView } from '@braneframe/plugin-splitview';
import {
  Main,
  Input,
  List,
  ListItem,
  Button,
  useTranslation,
  DensityProvider,
  DragEndEvent,
  useListContext,
  ListScopedProps,
  DropdownMenu,
  ButtonGroup,
} from '@dxos/aurora';
import { buttonFine, defaultBlockSeparator, getSize, mx, surfaceElevation } from '@dxos/aurora-theme';
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

const StackSection = ({ onRemove, section, __listScope }: ListScopedProps<StackSectionProps>) => {
  const { t } = useTranslation('dxos:stack');
  const { draggingId } = useListContext('StackSection', __listScope);
  const isDragging = draggingId === section.object.id;
  return (
    <DensityProvider density='fine'>
      <ListItem.Root
        id={section.object.id}
        classNames={[
          surfaceElevation({ elevation: 'group' }),
          'bg-white dark:bg-neutral-925 grow rounded mbe-2',
          '[--controls-opacity:1] hover-hover:[--controls-opacity:.1] hover-hover:hover:[--controls-opacity:1]',
          isDragging && 'relative z-10',
        ]}
      >
        <ListItem.Heading classNames='sr-only'>
          {get(section, 'object.title', t('generic section heading'))}
        </ListItem.Heading>
        <ListItem.DragHandle
          classNames={[
            buttonFine,
            'self-stretch flex items-center rounded-ie-none justify-center bs-auto is-auto focus:[--controls-opacity:1]',
          ]}
        >
          <DotsSixVertical className={mx(getSize(5), 'transition-opacity opacity-[--controls-opacity]')} />
        </ListItem.DragHandle>
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
};

// todo(thure): `observer` causes infinite rerenders if used here.
const StackMainImpl = ({ sections }: { sections: StackSections }) => {
  const [_, setIter] = useState([]);
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

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = sections.findIndex((section) => section.object.id === active.id);
      const newIndex = sections.findIndex((section) => section.object.id === over?.id);
      arrayMove(sections, oldIndex, newIndex);
    }
  }, []);

  return (
    <>
      <List
        variant='ordered-draggable'
        itemSizes='many'
        onDragEnd={handleDragEnd}
        listItemIds={sections
          // todo(thure): DRY-out this filter, also should this be represented in the UI?
          .filter((section) => !!section?.object?.id)
          .map(({ object: { id } }) => id)}
        classNames='pis-1 pie-2'
      >
        {sections
          .filter((section) => !!section?.object?.id)
          .map((section, start) => {
            return <StackSection key={section.object.id} onRemove={() => handleRemove(start)} section={section} />;
          })}
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

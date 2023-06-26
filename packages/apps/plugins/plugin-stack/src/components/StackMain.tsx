//
// Copyright 2023 DXOS.org
//

import { DotsSixVertical, Minus, Plus } from '@phosphor-icons/react';
import get from 'lodash.get';
import React, { useCallback, useEffect, useState } from 'react';

import {
  Main,
  Input,
  List,
  ListItem,
  Button,
  useTranslation,
  randomString,
  DensityProvider,
  DragEndEvent,
  arrayMoveInPlace,
  useListContext,
  ListScopedProps,
} from '@dxos/aurora';
import { buttonFine, defaultBlockSeparator, getSize, mx, surfaceElevation } from '@dxos/aurora-theme';
import { subscribe } from '@dxos/observable-object';
import { Surface } from '@dxos/react-surface';

import { StackModel, StackProperties, StackSectionModel, StackSections } from '../props';

type StackSectionProps = {
  onAdd: () => void;
  onRemove: () => void;
  section: StackSectionModel;
};

const StackSection = ({ onAdd, onRemove, section, __listScope }: ListScopedProps<StackSectionProps>) => {
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
          isDragging && 'relative z-10',
        ]}
      >
        <ListItem.Heading classNames='sr-only'>
          {get(section, 'object.title', t('generic section heading'))}
        </ListItem.Heading>
        <ListItem.DragHandle
          asChild
          classNames={[buttonFine, 'self-stretch flex items-center justify-center bs-auto is-auto']}
        >
          <DotsSixVertical className={getSize(5)} />
        </ListItem.DragHandle>
        <Surface role='section' data={section} />
        <Button variant='ghost' classNames='self-stretch justify-start' onClick={onRemove}>
          <span className='sr-only'>{t('remove section label')}</span>
          <Minus className={getSize(4)} />
        </Button>
      </ListItem.Root>
    </DensityProvider>
  );
};

// todo(thure): `observer` causes infinite rerenders if used here.
const StackMainImpl = ({ sections }: { sections: StackSections }) => {
  const [_, setIter] = useState([]);
  const { t } = useTranslation('dxos:stack');

  useEffect(() => {
    // todo(thure): TypeScript seems to get the wrong return value from `ObservableArray.subscribe`
    return sections[subscribe](() => setIter([])) as () => void;
  }, []);

  const handleAdd = useCallback(
    (start: number) => {
      const section: StackSectionModel = {
        source: { resolver: 'dxos:markdown', guid: randomString() },
        object: {
          id: randomString(),
          content: '',
        },
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
      arrayMoveInPlace<StackSectionModel>(sections, oldIndex, newIndex);
    }
  }, []);

  return (
    <>
      <List
        variant='ordered-draggable'
        itemSizes='many'
        onDragEnd={handleDragEnd}
        listItemIds={sections.map(({ object: { id } }) => id)}
        classNames='pis-1 pie-2'
      >
        {sections
          // todo(thure): This filter should be unnecessary; why is the first (or only?) value sometimes some sort of array-like object?
          .filter((section) => 'source' in section)
          .map((section, start) => {
            return (
              <StackSection
                key={section.object.id}
                onAdd={() => handleAdd(start)}
                onRemove={() => handleRemove(start)}
                section={section}
              />
            );
          })}
      </List>
      <div role='none' className='pis-1 pie-2'>
        <Button variant='ghost' onClick={() => handleAdd(sections.length)} classNames='is-full gap-2'>
          <Plus className={getSize(4)} />
          <span>{t('add section label')}</span>
        </Button>
      </div>
    </>
  );
};

export const StackMain = ({
  data: [stack, properties],
}: {
  data: [stack: StackModel, properties: StackProperties];
}) => {
  const { t } = useTranslation('dxos:stack');
  return (
    <Main.Content classNames='min-bs-[100vh] mli-auto max-is-[60rem]'>
      <Input.Root>
        <Input.Label srOnly>{t('stack title label')}</Input.Label>
        <Input.TextInput
          variant='subdued'
          classNames='flex-1 min-is-0 is-auto pis-2 plb-3.5 pointer-fine:plb-2.5'
          defaultValue={properties.title}
          onChange={({ target: { value } }) => (properties.title = value)}
        />
      </Input.Root>
      <div role='separator' className={mx(defaultBlockSeparator, 'mli-3 mbe-2 opacity-50')} />
      <StackMainImpl sections={stack.sections} />
    </Main.Content>
  );
};

//
// Copyright 2023 DXOS.org
//

import { CaretRight, Minus, Plus } from '@phosphor-icons/react';
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
} from '@dxos/aurora';
import { defaultBlockSeparator, getSize, mx, surfaceElevation } from '@dxos/aurora-theme';
import { subscribe } from '@dxos/observable-object';
import { Surface } from '@dxos/react-surface';
import { arrayMove } from '@dxos/util';

import { StackModel, StackProperties, StackSectionModel, StackSections } from '../props';

type StackSectionProps = {
  onAdd: () => void;
  onRemove: () => void;
  section: StackSectionModel;
};

const AddSection = ({ onClick }: { onClick: StackSectionProps['onAdd'] }) => {
  const { t } = useTranslation('dxos:stack');
  return (
    <Button variant='ghost' onClick={onClick} classNames='plb-0 pli-0.5 -mlb-1'>
      <span className='sr-only'>{t('add section label')}</span>
      <Plus className={getSize(4)} />
      <CaretRight className={getSize(3)} />
    </Button>
  );
};

const StackSection = ({ onAdd, onRemove, section }: StackSectionProps) => {
  const { t } = useTranslation('dxos:stack');
  return (
    <DensityProvider density='fine'>
      <AddSection onClick={onAdd} />
      <ListItem.Root id={section.object.id} classNames='flex gap-2 items-start justify-start'>
        <ListItem.Heading classNames='sr-only'>
          {get(section, 'object.title', t('generic section heading'))}
        </ListItem.Heading>
        <div role='none' className='p-1 -m-1 self-stretch flex flex-col'>
          <Button variant='ghost' classNames='p-0' onClick={onRemove}>
            <span className='sr-only'>{t('remove section label')}</span>
            <Minus className={getSize(4)} />
          </Button>
          <ListItem.DragHandle classNames='grow' />
        </div>
        <div
          role='none'
          className={mx(surfaceElevation({ elevation: 'group' }), 'bg-white dark:bg-neutral-925 grow rounded')}
        >
          <Surface role='section' data={section} />
        </div>
      </ListItem.Root>
    </DensityProvider>
  );
};

// todo(thure): `observer` causes infinite rerenders if used here.
const StackMainImpl = ({ sections }: { sections: StackSections }) => {
  const [_, setIter] = useState([]);
  useEffect(() => {
    // todo(thure): TypeScript seems to get the wrong return value from `ObservableArray.subscribe`
    return sections[subscribe](() => setIter([])) as () => void;
  }, []);

  const handleAdd = useCallback(
    (start: number) => {
      const section: StackSectionModel = {
        source: { resolver: 'dxos:markdown', guid: randomString() },
        object: {
          id: randomString(), // TODO(burdon): Must not use this for ECHO object.
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
      arrayMove(sections, oldIndex, newIndex);
    }
  }, []);

  return (
    <>
      <List
        variant='ordered-draggable'
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
        <AddSection onClick={() => handleAdd(sections.length)} />
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
          classNames='flex-1 min-is-0 is-auto pis-6 plb-3.5 pointer-fine:plb-2.5'
          defaultValue={properties.title}
          onChange={({ target: { value } }) => (properties.title = value)}
        />
      </Input.Root>
      <div role='separator' className={mx(defaultBlockSeparator, 'mli-3 mbe-2 opacity-50')} />
      <StackMainImpl sections={stack.sections} />
    </Main.Content>
  );
};

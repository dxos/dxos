//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { faker } from '@faker-js/faker';
import React, { type FC, type PropsWithChildren, useState } from 'react';

import { chromeSurface, mx } from '@dxos/react-ui-theme';

import { Card } from './Card';
import { testImages } from './testing';
import { DensityProvider } from '../DensityProvider';
import { DropdownMenu } from '../DropdownMenu';
import { Input } from '../Input';
import { ScrollArea } from '../ScrollArea';

faker.seed(1);

// TODO(burdon): Menu.
// TODO(burdon): Collapse.
// TODO(burdon): Editable.

type CardData = {
  id: string;
  title: string;
  body: string;
  image?: string;
};

const DraggableCard: FC<{ data: CardData; onDelete: (id: string) => void }> = ({
  data: { id, title, body, image },
  onDelete,
}) => {
  const { attributes, listeners, setNodeRef, transform } = useSortable({ id });
  const t = transform ? Object.assign(transform, { scaleY: 1 }) : null;

  return (
    <Card.Root ref={setNodeRef} style={{ transform: CSS.Transform.toString(t) }}>
      <Card.Header>
        <Card.DragHandle {...listeners} {...attributes} />
        <Card.Title title={title} />
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Card.Menu />
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Viewport>
              <DropdownMenu.Item onClick={() => onDelete(id)}>Delete</DropdownMenu.Item>
            </DropdownMenu.Viewport>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </Card.Header>
      <Card.Body classNames={'text-sm'} gutter>
        <p>{body}</p>
      </Card.Body>
      {image && <Card.Media src={image} classNames={'h-[160px]'} />}
    </Card.Root>
  );
};

const DraggableStory: FC<PropsWithChildren> = ({ children }) => {
  const [cards, setCards] = useState<CardData[]>(
    Array.from({ length: 7 }).map(() => ({
      id: faker.string.uuid(),
      title: faker.lorem.sentence(3),
      body: faker.lorem.sentences(),
      image: faker.datatype.boolean() ? faker.helpers.arrayElement(testImages) : undefined,
    })),
  );

  const handleDelete = (id: string) => {
    setCards((cards) => cards.filter((card) => card.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setCards((cards) => {
        const oldIndex = cards.findIndex((card) => card.id === active.id);
        const newIndex = cards.findIndex((card) => card.id === over?.id);
        return arrayMove(cards, oldIndex, newIndex);
      });
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <SortableContext items={cards.map(({ id }) => id)} strategy={verticalListSortingStrategy}>
        <div className='flex flex-col overflow-y-scroll'>
          <div className='flex flex-col m-4 gap-4'>
            {cards.map((card) => (
              <DraggableCard key={card.id} data={card} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      </SortableContext>
    </DndContext>
  );
};

const ReadonlyCardStory = () => {
  return (
    <div className='flex flex-col overflow-y-scroll p-8'>
      <div className='flex flex-col gap-8'>
        <Card.Root square noPadding>
          <Card.Header floating>
            <Card.DragHandle position='left' />
            <Card.Menu position='right' />
          </Card.Header>
          <Card.Media src={testImages[1]} />
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <Card.Title title={faker.lorem.sentence(3)} />
          </Card.Header>
        </Card.Root>

        <Card.Root>
          <Card.Body classNames={'text-sm font-thin h-[100px]'}>
            <ScrollArea.Root>
              <ScrollArea.Viewport>{faker.lorem.sentences(16)}</ScrollArea.Viewport>
              <ScrollArea.Scrollbar orientation='vertical'>
                <ScrollArea.Thumb />
              </ScrollArea.Scrollbar>
            </ScrollArea.Root>
          </Card.Body>
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <Card.Title center title={faker.lorem.sentence(3)} />
          </Card.Header>
          <Card.Body classNames={'text-sm font-thin'}>{faker.lorem.sentences(3)}</Card.Body>
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <Card.DragHandle />
            <Card.Title title={faker.lorem.sentence(8)} />
            {/* TODO(burdon): Menu util. */}
            <Card.Menu />
          </Card.Header>
          <Card.Body gutter classNames={'gap-2 text-sm font-thin'}>
            <p>Content with gutter</p>
            <p className='line-clamp-3'>{faker.lorem.sentences(3)}</p>
          </Card.Body>
        </Card.Root>

        <Card.Root>
          <Card.Header>
            <Card.DragHandle />
            <Card.Title title={faker.lorem.sentence(3)} />
            <Card.Menu />
          </Card.Header>
          <Card.Body gutter classNames={'text-sm gap-2 font-thin'}>
            <p className='line-clamp-3'>{faker.lorem.sentences(1)}</p>
          </Card.Body>
          <Card.Media classNames={'h-[200px] grayscale'} src={testImages[0]} />
          <Card.Body gutter classNames={'text-sm gap-2 font-thin'}>
            <p className='line-clamp-3'>{faker.lorem.sentences(3)}</p>
          </Card.Body>
        </Card.Root>
      </div>
    </div>
  );
};

const EditableCardStory = () => {
  return (
    <div className='flex flex-col overflow-y-scroll p-8'>
      <div className='flex flex-col gap-8'>
        <Card.Root>
          <Card.Header>
            <Card.DragHandle />
            <Input.Root>
              <Input.TextInput classNames={'-mx-2 px-2'} variant='subdued' placeholder={'Title'} />
            </Input.Root>
            <Card.Menu />
          </Card.Header>
          <Card.Body gutter classNames={'gap-2 text-sm font-thin'}>
            {faker.lorem.sentences()}
          </Card.Body>
        </Card.Root>
      </div>
    </div>
  );
};

export default {
  component: Card,
  args: {},
  decorators: [
    (Story: any) => (
      <div className={mx('flex h-screen w-full justify-center overflow-hidden', chromeSurface)}>
        {/* TODO(burdon): Story for different densities. */}
        <DensityProvider density='fine'>
          <Story />
        </DensityProvider>
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Draggable = () => <DraggableStory />;
export const ReadOnly = () => <ReadonlyCardStory />;
export const Editable = () => <EditableCardStory />;

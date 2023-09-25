//
// Copyright 2023 DXOS.org
//

import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { faker } from '@faker-js/faker';
import React, { FC, PropsWithChildren, useState } from 'react';

import { chromeSurface, mx } from '@dxos/aurora-theme';

import '@dxosTheme';

import { Card } from './Card';
import { testImages } from './testing';
import { DensityProvider } from '../DensityProvider';
import { Input } from '../Input';
import { ScrollArea } from '../ScrollArea';

faker.seed(1);

// TODO(burdon): Draggable story.
// TODO(burdon): Collapse.
// TODO(burdon): Editable.
// TODO(burdon): Menu.

type CardData = {
  id: string;
  title: string;
  body: string;
  image?: string;
};

const DraggableCard: FC<{ data: CardData }> = ({ data: { id, title, body, image } }) => {
  const { attributes, listeners, setNodeRef, transform } = useSortable({ id });
  const t = transform ? Object.assign(transform, { scaleY: 1 }) : null;

  // TODO(burdon): Css to replace image not found.

  // TODO(burdon): Apply attr to handle?
  return (
    <Card.Root ref={setNodeRef} {...attributes} {...listeners} style={{ transform: CSS.Transform.toString(t) }}>
      <Card.Header>
        <Card.DragHandle />
        <Card.Title title={title} />
      </Card.Header>
      <Card.Body classNames={'text-sm'} gutter>
        <p>{body}</p>
      </Card.Body>
      {image && <Card.Media src={image} classNames={'h-[100px]'} />}
    </Card.Root>
  );
};

const DraggableStory: FC<PropsWithChildren> = ({ children }) => {
  const [cards, setCards] = useState<CardData[]>(
    Array.from({ length: 3 }).map(() => ({
      id: faker.string.uuid(),
      title: faker.lorem.sentence(3),
      body: faker.lorem.sentences(),
      image: faker.datatype.boolean() ? faker.helpers.arrayElement(testImages) : undefined,
    })),
  );

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
    <DensityProvider density={'fine'}>
      <DndContext onDragEnd={handleDragEnd}>
        <SortableContext items={cards.map(({ id }) => id)} strategy={verticalListSortingStrategy}>
          <div className='flex flex-col m-4 gap-4'>
            {cards.map((card) => (
              <DraggableCard key={card.id} data={card} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </DensityProvider>
  );
};

const ReadonlyCardStory = () => {
  return (
    <DensityProvider density={'fine'}>
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
              <Card.Title padding title={faker.lorem.sentence(3)} />
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
    </DensityProvider>
  );
};

const EditableCardStory = () => {
  return (
    <div className='flex flex-col overflow-y-scroll p-8'>
      <div className='flex flex-col gap-8'>
        <Card.Root>
          <Card.Header>
            <Card.DragHandle />
            {/* TODO(burdon): Padding. */}
            <Input.Root>
              <Input.TextInput classNames={'-mx-2 p-2'} placeholder={'Title'} />
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

// const CardStory = () => {
//   return (
//     <ScrollArea.Root classNames={[groupSurface, 'p-4']}>
//       <ScrollArea.Viewport>
//         <div className='flex flex-col w-[400px] gap-2'>
//           <Card {...generators.document()} />
//           <DraggableCard {...generators.image()} />
//           <DraggableCard {...generators.contact()} />
//           <DraggableCard {...generators.message()} />
//           <DraggableCard {...generators.project()} />
//         </div>
//       </ScrollArea.Viewport>
//       <ScrollArea.Scrollbar orientation='vertical'>
//         <ScrollArea.Thumb />
//       </ScrollArea.Scrollbar>
//     </ScrollArea.Root>
//   );
// };

export default {
  component: Card,
  args: {},
  decorators: [
    (Story: any) => (
      <div className={mx('flex h-screen w-full justify-center overflow-hidden', chromeSurface)}>
        <Story />
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

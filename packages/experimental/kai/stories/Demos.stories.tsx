//
// Copyright 2023 DXOS.org
//

import faker from 'faker';
import React, { ComponentProps, FC, ReactNode } from 'react';

import { mx } from '@dxos/react-components';

import '@dxosTheme';

import { range, MinMax } from '../proto';

const Frame: FC<{ children: ReactNode }> = ({ children }) => {
  return <div className='flex absolute top-0 bottom-0 left-0 right-0 p-8'>{children}</div>;
};

export default {
  component: Frame
};

type Item = { id: string; label: string; expanded: boolean; selected: boolean };

// TODO(burdon): Use testing lib without db.
const createItem = (n: MinMax): Item[] =>
  range(n).map(() => ({
    id: faker.datatype.uuid(),
    label: faker.lorem.word(8),
    expanded: faker.datatype.boolean(),
    selected: faker.datatype.boolean()
  }));

//
// Elements
//

type CardProps = { className?: string; square?: boolean; selected?: boolean } & Omit<
  ComponentProps<'div'>,
  'className'
>;

const Card: FC<CardProps> = ({ className, square, selected, ...props }) => {
  return (
    <div
      className={mx(
        'flex m-1 p-2 rounded border',
        selected ? 'bg-blue-100' : 'bg-paper-bg',
        square ? 'w-[160px] h-[160px]' : 'w-[160px]',
        className
      )}
      {...props}
    />
  );
};

const Column: FC<{ items: Item[]; label?: string }> = ({ items, label }) => {
  return (
    <div className='flex flex-col p-2 rounded border border-gray-400 bg-gray-200'>
      {label && <div className='pb-1 text-sm'>{label}</div>}
      {items.map(({ id, label }) => (
        <Card key={id}>{label}</Card>
      ))}
    </div>
  );
};

//
// Frames
//

export const List = () => {
  return (
    <Frame>
      <div>
        <Column items={createItem({ min: 2, max: 6 })} />
      </div>
    </Frame>
  );
};

export const Stack = () => {
  const items = createItem({ min: 4, max: 7 });
  return (
    <Frame>
      <div>
        <div className='flex flex-col p-2 rounded border border-gray-400 bg-gray-200'>
          {items.map(({ id, label, expanded }) => (
            <Card key={id} square={expanded}>
              {label}
            </Card>
          ))}
        </div>
      </div>
    </Frame>
  );
};

export const Kanban = () => {
  return (
    <Frame>
      <div>
        <div className='flex grid-cols-3 gap-4'>
          <Column items={createItem({ min: 2, max: 6 })} label='red' />
          <Column items={createItem({ min: 2, max: 6 })} label='green' />
          <Column items={createItem({ min: 2, max: 6 })} label='blue' />
        </div>
      </div>
    </Frame>
  );
};

export const Masonry = () => {
  const Column = () => {
    const items = createItem({ min: 2, max: 3 });
    return (
      <div className='flex flex-col border-gray-400 bg-gray-200'>
        {items.map(({ id, label }) => (
          <Card key={id} square={faker.datatype.boolean()}>
            {label}
          </Card>
        ))}
      </div>
    );
  };

  return (
    <Frame>
      <div>
        <div className='flex grid grid-cols-3 p-2 gap-1 border border-gray-400 bg-gray-200'>
          <Column />
          <Column />
          <Column />
        </div>
      </div>
    </Frame>
  );
};

export const Grid = () => {
  const items = createItem({ min: 4, max: 8 });
  return (
    <Frame>
      <div>
        <div className='flex grid grid-cols-3 gap-1 p-2 border border-gray-400 bg-gray-200'>
          {items.map(({ id, label }) => (
            <Card key={id} square selected={id === items[1].id}>
              {label}
            </Card>
          ))}
        </div>
      </div>
    </Frame>
  );
};

export const MasterDetail = () => {
  return (
    <Frame>
      <div>
        <div className='flex p-2 rounded border border-gray-400 bg-gray-200'>
          <div>
            <Card>1</Card>
            <Card selected>2</Card>
            <Card>3</Card>
            <Card>4</Card>
            <Card>5</Card>
          </div>
          <div className='flex w-[200px] m-1 ml-2 p-3 rounded border border-gray-400 bg-paper-bg text-sm'>
            {faker.lorem.sentences(3)}
          </div>
        </div>
      </div>{' '}
    </Frame>
  );
};

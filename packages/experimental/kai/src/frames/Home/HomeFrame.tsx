//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { LedStrip } from '@dxos/kai-types';
import { observer, Space, useQuery } from '@dxos/react-client';

import { Button, getSize, Input, mx } from '@dxos/react-components';
import { ArrowCircleRight, Lightbulb, Square, UserCirclePlus } from '@phosphor-icons/react';
import { Card, CardProps, CardRow } from '../../cards';
import { useAppRouter } from '../../hooks';

export const HomeFrame = () => {
  const { space } = useAppRouter();
  const devices = useQuery(space, LedStrip.filter());

  if (!space) {
    return null;
  }

  return (
    <div className='flex flex-1 overflow-x-scroll mt-4 md:mx-4'>
      <CardList
        space={space}
        className='flex flex-col flex-wrap'
        objects={devices}
      />
    </div>
  );
};

const CardList: FC<{
  space: Space;
  objects: LedStrip[];
  className?: string;
}> = ({ space, objects, className, }) => (
  <div className={className}>
    {objects.map((object) => (
      <div key={object.id} className='flex mb-2 md:mr-2'>
        <LedStripCard
          slots={{ root: { className: 'w-column' } }}
          space={space}
          object={object}
        // selected={object.id === selected?.id}
        // onSelect={onSelect}
        />
      </div>
    ))}
  </div>
);

export const LedStripCard = observer(({ slots = {}, object, selected, temporary, onSelect, onAction }: CardProps<LedStrip>) => {

  return (
    <Card slots={slots}>
      <CardRow
        gutter={
          <Button variant='ghost' onClick={() => onSelect?.(object)}>
            {(temporary && <UserCirclePlus weight='thin' className={getSize(6)} />) || (
              <Lightbulb className={mx(getSize(6), 'text-sky-600')} />
            )}
          </Button>
        }
        action={
          onAction && (
            <Button variant='ghost' onClick={() => onAction?.(object)}>
              <ArrowCircleRight className={getSize(6)} />
            </Button>
          )
        }
      >
        <Input
          variant='subdued'
          label='Title'
          labelVisuallyHidden
          value={object.title ?? ''}
          onChange={e => { object.title = e.target.value }}
        />
      </CardRow>

      <CardRow>
        <div className='flex'>
          <div className='grid grid-cols-6'>
            {colors.map(color => (
              <Button key={color} variant='ghost' className='p-0' onClick={() => object.color = color}>
                <div className={mx('m-2', object.color === color && 'ring-2 ring-black')}>
                  <Square className={mx(getSize(6), color, 'text-transparent')} />
                </div>
              </Button>
            ))}
          </div>
        </div>
      </CardRow>
    </Card>
  );
});


export const colors: string[] = [
  'bg-slate-400',
  'bg-zinc-400',
  'bg-red-400',
  'bg-orange-400',
  'bg-emerald-400',
  'bg-cyan-400',
  'bg-sky-400',
  'bg-blue-400',
  'bg-indigo-400',
  'bg-fuchsia-400',
  'bg-violet-400',
  'bg-pink-400',
];

export default HomeFrame;

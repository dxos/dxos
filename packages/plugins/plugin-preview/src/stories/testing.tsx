//
// Copyright 2025 DXOS.org
//

import React, { type FC, useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Card } from '@dxos/react-ui';
import { CardContainer, type CardContainerProps } from '@dxos/react-ui-mosaic/testing';

import { JsonCard } from '../cards';
import { omitImage } from './fixtures';

export type StoryArgs<T extends Obj.Any, P extends {} = {}> = {
  Component: FC<AppSurface.ObjectCardProps<T> & P>;
  createObject: () => T;
  image?: boolean;
  json?: boolean;
  componentProps?: P;
};

export const DefaultStory = <T extends Obj.Any, P extends {} = {}>({
  Component,
  createObject,
  image,
  json,
  componentProps,
}: StoryArgs<T, P>) => {
  const object = useMemo(() => createObject(), [createObject]);
  const roles: CardContainerProps['role'][] = ['intrinsic', 'popover'];

  return (
    <div className='dx-fill grid grid-cols-2 py-16 gap-8'>
      {roles.map((role, i) => (
        <div key={i} className='flex h-full justify-center overflow-hidden'>
          <div className='flex flex-col gap-4 w-full items-center'>
            <span className='text-sm text-description'>{role}</span>
            <CardContainer role={role}>
              <Card.Root border={false}>
                <Card.Header>
                  <Card.DragHandle />
                  <Card.Title>{Obj.getLabel(object)}</Card.Title>
                  <Card.Menu />
                </Card.Header>
                <Component
                  role={role ?? 'card--content'}
                  subject={image ? object : omitImage(object)}
                  {...(componentProps ?? ({} as P))}
                />
                {json && <JsonCard data={object} />}
              </Card.Root>
            </CardContainer>
          </div>
        </div>
      ))}
    </div>
  );
};

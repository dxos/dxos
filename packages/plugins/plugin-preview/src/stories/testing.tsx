//
// Copyright 2025 DXOS.org
//

import React, { type FC, useMemo } from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import { CardContainer, type CardContainerProps } from '@dxos/react-ui-mosaic/testing';
import * as Card from '@dxos/react-ui/Card';
import * as DragHandle from '@dxos/react-ui/DragHandle';

import { JsonCard } from '../cards/index.ts';
import { omitImage } from './fixtures.ts';

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
            <span className='text-sm text-fg-muted'>{role}</span>
            <CardContainer role={role}>
              <Card.Root border={false}>
                <Card.Header>
                  <DragHandle.DragHandle />
                  <Card.Title>{Obj.getLabel(object)}</Card.Title>
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

//
// Copyright 2023 DXOS.org
//

import React, { FC, PropsWithChildren, ReactNode } from 'react';

import { ClassNameValue } from '@dxos/aurora-types';

import { Card } from './Card';

//
// Standard Layouts
// TODO(burdon): Factor out.
//

export type LayoutProps = {
  classNames?: ClassNameValue;
  handle?: ReactNode;
  menu?: ReactNode;
};

export const ImageCard: FC<
  LayoutProps & { src: string; body?: string; contain?: boolean; square?: boolean; bottom?: boolean }
> = ({ classNames, handle, menu, src, body, contain, square, bottom }) => {
  return (
    <Card.Root classNames={classNames} noPadding>
      {(handle || menu) && (
        <div className='relative'>
          <div className='absolute mx-2 my-2 rounded bg-white opacity-40 group-hover:opacity-80'>{handle}</div>
          <div className='absolute mx-2 my-2 rounded group-hover:bg-white group-hover:opacity-80 right-0'>{menu}</div>
        </div>
      )}
      {body && !bottom && (
        <div className='p-2 text-sm'>
          <span className='line-clamp-[3]'>{body}</span>
        </div>
      )}
      <div>
        <img
          className={mx(
            square && 'aspect-square',
            contain ? 'object-contain' : 'object-cover',
            (!body || bottom) && 'rounded-t',
            (!body || !bottom) && 'rounded-b',
          )}
          src={src}
        />
      </div>
      {body && bottom && (
        <div className='p-2 text-sm'>
          <span className='line-clamp-[3]'>{body}</span>
        </div>
      )}
    </Card.Root>
  );
};

// TODO(burdon): Editable typed properties.
export const FormCard: FC<
  PropsWithChildren<
    LayoutProps & {
      title?: string;
      sections?: { label?: string; value: string }[];
    }
  >
> = ({ classNames, handle, menu, title, children, sections }) => {
  return (
    <Card.Root classNames={classNames}>
      <Card.Header>
        {handle}
        <CardTitle title={title} />
        {menu}
      </Card.Header>
      <Card.Body indent={!!handle}>
        {sections?.length &&
          sections.map(({ label, value }, i) => (
            <div key={i}>
              {label && <div className='font-thin text-xs'>{label}</div>}
              <div className='text-sm'>{value}</div>
            </div>
          ))}
        {children}
      </Card.Body>
    </Card.Root>
  );
};

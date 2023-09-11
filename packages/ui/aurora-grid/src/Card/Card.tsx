//
// Copyright 2023 DXOS.org
//

import { DotsSixVertical, DotsThreeVertical } from '@phosphor-icons/react';
import React, { FC, PropsWithChildren, ReactNode } from 'react';

import { ClassNameValue, DensityProvider } from '@dxos/aurora';
import { getSize, inputSurface, mx } from '@dxos/aurora-theme';

// TODO(burdon): Factor out styles.

export const CardRoot: FC<
  PropsWithChildren<{ classNames?: ClassNameValue; square?: boolean; noPadding?: boolean }>
> = ({ classNames, children, square, noPadding }) => {
  return (
    <DensityProvider density='fine'>
      <div
        className={mx(
          'flex flex-col group w-full min-w-[280px] max-w-[400px] max-h-[400px] overflow-hidden',
          square && 'aspect-square',
          'shadow-sm rounded',
          !noPadding && 'py-2 gap-1',
          inputSurface,
          classNames,
        )}
      >
        {children}
      </div>
    </DensityProvider>
  );
};

export const CardHeader: FC<PropsWithChildren<{ classNames?: ClassNameValue }>> = ({ classNames, children }) => (
  <div className={mx('flex w-full px-2 overflow-hidden', classNames)}>{children}</div>
);

export const CardBody: FC<PropsWithChildren<{ classNames?: ClassNameValue; indent?: boolean }>> = ({
  classNames,
  children,
  indent,
}) => <div className={mx('flex flex-col px-2 gap-2', indent && 'ml-8', classNames)}>{children}</div>;

// TODO(burdon): Doesn't truncate.
export const CardTitle: FC<{ classNames?: ClassNameValue; title?: string }> = ({ classNames, title }) => (
  <div className={mx('w-full truncate', classNames)}>{title}</div>
);

export const CardHandle: FC<any> = ({ ...props }) => {
  return (
    <div className={'flex shrink-0 mx-1 w-6 h-6 justify-center items-center'} {...props}>
      <DotsSixVertical className={mx(getSize(5), 'outline-none cursor-pointer')} />
    </div>
  );
};

export const CardMenu: FC<any> = () => {
  return (
    <div className={'flex shrink-0 mx-1 w-6 h-6 justify-center items-center'}>
      <DotsThreeVertical className={mx(getSize(5), 'outline-none cursor-pointer')} />
    </div>
  );
};

export const Card = {
  Root: CardRoot,
  Header: CardHeader,
  Handle: CardHandle,
  Menu: CardMenu,
  Title: CardTitle,
  Body: CardBody,
};

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

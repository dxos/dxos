//
// Copyright 2022 DXOS.org
//

import React, { FC, ReactNode } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { mx } from '@dxos/react-components';

import { ContactList, OrganizationList, ProjectHierarchy, UnorderedTaskList } from '../../containers';
import { useSpace } from '../../hooks';

export const TileMenu: FC<{ title: string; children?: ReactNode }> = ({ title, children }) => {
  return (
    <div className='flex w-full p-2 px-2 items-center border-b'>
      <h2>{title}</h2>
      <div className='flex-1' />
      {children}
    </div>
  );
};

export const Tile: FC<{
  children?: ReactNode;
  scrollbar?: boolean;
  header?: JSX.Element;
}> = ({ scrollbar, header, children }) => {
  return (
    <div className='flex flex-col w-full bg-paper-bg border-r overflow-hidden'>
      {header}
      <div
        className={mx('flex flex-1 flex-col pr-2 py-2 bg-paper-bg', scrollbar ? 'overflow-auto' : 'overflow-hidden')}
      >
        {children}
      </div>
    </div>
  );
};

export const StackFrame: FC = () => {
  const space = useSpace();
  const { ref } = useResizeDetector();
  const cardStyles = 'flex shrink-0';

  return (
    <div
      ref={ref}
      className={mx(
        'flex flex-col h-full overflow-x-hidden overflow-y-scroll gap-0',
        'p-0', // Full width for mobile.
        'md:p-0 md:gap-0 md:grid md:overflow-hidden md:grid-cols-2 md:grid-rows-2',
        'lg:p-0 lg:gap-0 lg:grid lg:overflow-hidden lg:grid-cols-3 lg:grid-rows-2'
      )}
    >
      <div className={mx(cardStyles)}>
        <Tile scrollbar header={<TileMenu title='Organizations' />}>
          <OrganizationList space={space} />
        </Tile>
      </div>

      <div className={mx(cardStyles, 'row-span-2')}>
        <Tile scrollbar header={<TileMenu title='Contacts' />}>
          <ContactList space={space} />
        </Tile>
      </div>

      <div className={mx(cardStyles, 'row-span-2')}>
        <Tile scrollbar header={<TileMenu title='Tasks' />}>
          <UnorderedTaskList space={space} />
        </Tile>
      </div>

      <div className={mx(cardStyles)}>
        <Tile scrollbar header={<TileMenu title='Projects' />}>
          <ProjectHierarchy space={space} />
        </Tile>
      </div>
    </div>
  );
};

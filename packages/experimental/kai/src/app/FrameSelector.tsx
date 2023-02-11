//
// Copyright 2022 DXOS.org
//

import { Globe, CaretRight } from 'phosphor-react';
import React, { FC, useContext } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getSize, mx } from '@dxos/react-components';
import { PanelSidebarContext, useTogglePanelSidebar } from '@dxos/react-ui';

// TODO(burdon): Rename frames.

import { useActiveFrames, useSpace, createSpacePath, Section } from '../hooks';

/**
 * View tabs.
 */
export const FrameSelector: FC = () => {
  const space = useSpace();
  const frames = useActiveFrames();
  const { section, frame: currentFrame } = useParams();
  const { displayState } = useContext(PanelSidebarContext);
  const isOpen = displayState === 'show';
  const toggleSidebar = useTogglePanelSidebar();

  const Tab: FC<{ selected: boolean; title: string; Icon: FC<any>; link: string }> = ({
    selected,
    title,
    Icon,
    link
  }) => {
    return (
      <div
        className={mx('flex p-1 px-2 lg:mr-2 items-center cursor-pointer rounded-t text-black', selected && 'bg-white')}
      >
        <Link className='flex' to={link} title={title}>
          <Icon weight='light' className={getSize(6)} />
          <div className='hidden lg:flex ml-1'>{title}</div>
        </Link>
      </div>
    );
  };

  return (
    <div
      className={mx(
        'flex flex-col-reverse bg-appbar-toolbar',
        'fixed inline-end-0 block-start-appbar bs-toolbar transition-[inset-inline-start] duration-200 ease-in-out z-[1]',
        isOpen ? 'inline-start-0 lg:inline-start-sidebar' : 'inline-start-0'
      )}
    >
      <div className='flex justify-between'>
        <div className='flex items-center'>
          {!isOpen && (
            <button className='ml-5 mr-2' onClick={toggleSidebar}>
              {<CaretRight className={getSize(6)} />}
            </button>
          )}

          {frames
            .filter(({ system }) => !system)
            .map(({ id, title, Icon }) => (
              <Tab
                key={id}
                selected={id === currentFrame}
                title={title}
                Icon={Icon}
                link={createSpacePath(space.key, id)}
              />
            ))}
        </div>

        <div className='flex items-center mr-3'>
          <Tab selected={section === Section.REGISTRY} title='Registry' Icon={Globe} link={Section.REGISTRY} />
        </div>
      </div>
    </div>
  );
};

/**
 * Viewport for frame.
 */
export const FrameContainer: FC<{ frame: string }> = ({ frame }) => {
  const frames = useActiveFrames();
  const active = frames.find(({ id }) => id === frame);
  const { Component } = active ?? {};
  if (!Component) {
    return null;
  }

  return <Component />;
};

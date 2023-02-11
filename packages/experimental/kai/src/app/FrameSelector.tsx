//
// Copyright 2022 DXOS.org
//

import { Globe, CaretRight } from 'phosphor-react';
import React, { FC, useContext } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getSize, mx } from '@dxos/react-components';
import { PanelSidebarContext, useTogglePanelSidebar } from '@dxos/react-ui';

// TODO(burdon): Rename frames.

import { useFrames, useSpace, createSpacePath, Section } from '../hooks';

/**
 * View tabs.
 */
export const FrameSelector: FC = () => {
  const space = useSpace();
  const { frames, active: activeFrames } = useFrames();
  const { section, frame: currentFrame } = useParams();
  const { displayState } = useContext(PanelSidebarContext);
  const isOpen = displayState === 'show';
  const toggleSidebar = useTogglePanelSidebar();

  const Tab: FC<{ selected: boolean; label: string; Icon: FC<any>; link: string }> = ({
    selected,
    label,
    Icon,
    link
  }) => {
    return (
      <div
        className={mx('flex p-1 px-2 lg:mr-2 items-center cursor-pointer rounded-t text-black', selected && 'bg-white')}
      >
        <Link className='flex' to={link} title={label}>
          <Icon weight='light' className={getSize(6)} />
          <div className='hidden lg:flex ml-1'>{label}</div>
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

          {Array.from(activeFrames)
            .map((frameId) => frames.get(frameId)!)
            .filter(Boolean)
            .map(({ module: { id, displayName }, runtime: { Icon } }) => (
              <Tab
                key={id}
                selected={id === currentFrame}
                label={displayName ?? ''}
                Icon={Icon}
                link={createSpacePath(space.key, id)}
              />
            ))}
        </div>

        <div className='flex items-center mr-3'>
          <Tab selected={section === Section.REGISTRY} label='Registry' Icon={Globe} link={Section.REGISTRY} />
        </div>
      </div>
    </div>
  );
};

/**
 * Viewport for frame.
 */
export const FrameContainer: FC<{ frame: string }> = ({ frame }) => {
  const { frames, active: activeFrames } = useFrames();
  if (!activeFrames.find((frameId) => frameId === frame)) {
    return null;
  }

  const Component = frames.get(frame)?.runtime.Component;
  if (!Component) {
    return null;
  }

  return <Component />;
};

//
// Copyright 2022 DXOS.org
//

import { Globe } from 'phosphor-react';
import React, { FC } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getSize, mx } from '@dxos/react-components';

import { useFrames, createSpacePath, Section, useFrameState } from '../../hooks';

// TODO(burdon): Floating buttons since main content isn't uniform for tabs.
const Tab: FC<{ selected: boolean; label?: string; Icon: FC<any>; link: string; compact: boolean }> = ({
  selected,
  label,
  Icon,
  link,
  compact = false
}) => {
  return (
    <div className={mx('flex p-1 px-2 lg:mr-2 items-center cursor-pointer rounded-t', selected && 'bg-paper-2-bg')}>
      <Link className='flex' to={link} title={label}>
        <Icon weight='light' className={getSize(6)} />
        {!compact && <div className='hidden lg:flex ml-1'>{label}</div>}
      </Link>
    </div>
  );
};

/**
 * Frame tabs.
 */
export const FrameSelector: FC = () => {
  const { space } = useFrameState();
  const { frames, active: activeFrames } = useFrames();
  const { section, frame: currentFrame } = useParams();
  const maxTabs = 8; // TODO(burdon): Media query?

  return (
    <div className='flex flex-col-reverse w-full'>
      <div className='flex justify-between'>
        <div className='flex items-center'>
          {Array.from(activeFrames)
            .map((frameId) => frames.get(frameId)!)
            .filter(Boolean)
            .map(({ module: { id, displayName }, runtime: { Icon } }) => (
              <Tab
                key={id}
                selected={id === currentFrame}
                label={displayName ?? ''}
                Icon={Icon}
                link={createSpacePath(space!.key, id)}
                compact={activeFrames.length > maxTabs}
              />
            ))}
        </div>

        <div className='flex items-center mr-1'>
          <Tab
            selected={section === Section.REGISTRY}
            label='Registry'
            Icon={Globe}
            link={Section.REGISTRY}
            compact={activeFrames.length > maxTabs}
          />
        </div>
      </div>
    </div>
  );
};

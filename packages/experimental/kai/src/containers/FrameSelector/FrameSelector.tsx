//
// Copyright 2022 DXOS.org
//

import { Globe } from 'phosphor-react';
import React, { FC } from 'react';
import { Link } from 'react-router-dom';

import { getSize, mx } from '@dxos/react-components';

import { useAppRouter, useFrames, createPath, decodeFrame, Section } from '../../hooks';

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
  const { space } = useAppRouter();
  const { frames, active: activeFrames } = useFrames();
  const { section, frame: currentFrame } = useAppRouter();
  const maxTabs = 6; // TODO(burdon): Media query?
  if (!space) {
    return null;
  }

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
                selected={decodeFrame(id!) === currentFrame?.module.id}
                label={displayName ?? ''}
                Icon={Icon}
                link={createPath({ spaceKey: space.key, frame: id })}
                compact={activeFrames.length > maxTabs}
              />
            ))}
        </div>

        <div className='flex items-center mr-1'>
          <Tab
            selected={section === Section.REGISTRY}
            label='Registry'
            Icon={Globe}
            link={createPath({ spaceKey: space.key, section: Section.REGISTRY })}
            compact={activeFrames.length > maxTabs}
          />
        </div>
      </div>
    </div>
  );
};

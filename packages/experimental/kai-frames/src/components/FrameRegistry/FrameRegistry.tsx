//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { getSize, mx } from '@dxos/react-ui-theme';
import { ScrollContainer } from '@dxos/mosaic';

import { FrameDef } from '../../registry';

// Rank last if tags.
// TODO(burdon): Create sections (e.g., Community).
const len = (array?: any[]) => array?.length ?? 0;
const sorter = (
  { module: { displayName: a, tags: t1 } }: FrameDef<any>,
  { module: { displayName: b, tags: t2 } }: FrameDef<any>,
) => (len(t1) < len(t2) ? -1 : len(t1) > len(t2) ? 1 : a! < b! ? -1 : a! > b! ? 1 : 0);

export type FrameRegistrySlots = {
  root?: {
    className?: string;
  };
  tile?: {
    className?: string;
  };
};

const FrameTile: FC<{
  id: string;
  label: string;
  description?: string;
  active: boolean;
  slots?: FrameRegistrySlots;
  Icon: FC<any>;
  onSelect?: (id: string) => void;
}> = ({ id, label, description, active, slots = {}, Icon, onSelect }) => {
  return (
    <div
      className={mx(
        'flex flex-col w-[200px] h-[200px] border-0 rounded px-3 py-2',
        'cursor-pointer bg-paper-1-bg hover:bg-hover-bg border',
        active && 'border-selection-border !bg-selection-bg',
        slots.tile?.className,
      )}
      onClick={() => onSelect?.(id)}
    >
      <div className='flex w-full'>
        <h2 className='flex w-full mb-1 text-lg font-display font-medium'>{label}</h2>
        <div>
          <Icon weight='duotone' className={mx(getSize(8), '[&>*]:stroke-[8]')} />
        </div>
      </div>
      <div className='flex w-full pt-1 text-black text-sm'>{description}</div>
    </div>
  );
};

// TODO(burdon): Reconcile with kai.
export const FrameRegistry: FC<{
  slots?: FrameRegistrySlots;
  frames?: FrameDef<any>[];
  selected?: string[];
  onSelect?: (frameId: string) => void;
}> = ({ slots = {}, frames = [], selected = [], onSelect }) => {
  return (
    <div className={mx('flex flex-1 overflow-hidden bg-zinc-200', slots.root?.className)}>
      <ScrollContainer horizontal>
        <div className='flex p-8 gap-8'>
          {frames.sort(sorter).map(({ module: { id, displayName, description }, runtime: { Icon } }) => (
            <FrameTile
              key={id!}
              id={id!}
              label={displayName ?? id!}
              description={description}
              slots={slots}
              Icon={Icon}
              onSelect={onSelect}
              active={!!selected.find((active) => active === id)}
            />
          ))}
        </div>
      </ScrollContainer>
    </div>
  );
};

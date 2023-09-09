//
// Copyright 2023 DXOS.org
//

import { DotsSixVertical } from '@phosphor-icons/react';
import React, { FC } from 'react';

import { getSize, mx } from '@dxos/aurora-theme';

// TODO(burdon): Compact table/form section.
// TODO(burdon): Cards are used across search, kanban, threads, notes, etc.
// TODO(burdon): Icon.
export type CardProps = {
  id: string;
  title: string;
  sections?: {
    text?: string;
  }[];
};

// TODO(burdon): Max height (expand).
export const Card: FC<CardProps> = ({ id, title, sections }) => {
  return (
    <div key={id} className='flex shadow-sm rounded my-2 px-3 py-2 gap-2 bg-white'>
      <div className='shrink-0 py-1'>
        <DotsSixVertical className={mx(getSize(5), 'cursor-pointer')} />
      </div>
      <div className='flex flex-col grow gap-2'>
        <div>{title}</div>
        {sections?.map((section, i) => (
          <div key={i} className='text-sm font-thin'>
            {section?.text}
          </div>
        ))}
      </div>
    </div>
  );
};

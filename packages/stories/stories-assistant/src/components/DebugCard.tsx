//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Obj, type Relation } from '@dxos/echo';
import { type ObjectId } from '@dxos/keys';

interface DebugCardProps {
  obj: Obj.Any | Relation.Any;
}

export const DebugCard = ({ obj }: DebugCardProps) => {
  return (
    <div className='border border-separator rounded-lg p-4 bg-surface'>
      <div className='flex items-center justify-between mb-2'>
        <h3 className='font-medium text-lg'>{Obj.getLabel(obj)}</h3>
        <p className='flex gap-2 items-center'>
          <span className='text-sm font-mono dx-text-hue' data-hue={colors[insecureIdHash(obj.id, colors.length)]}>
            #{obj.id.slice(-6)}
          </span>
          <span className='text-sm text-description bg-neutral-800 px-2 py-1 rounded'>{Obj.getTypename(obj)}</span>
        </p>
      </div>
      <details className='group'>
        <summary className='cursor-pointer text-sm text-primary hover:text-primaryHover'>View JSON</summary>
        <pre className='mt-2 text-xs p-3 rounded overflow-x-auto'>{JSON.stringify(obj, null, 2)}</pre>
      </details>
    </div>
  );
};

const insecureIdHash = (id: ObjectId, modulo: number) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const num = id.charCodeAt(i);
    hash = (hash ^ num) | 0;
  }
  return Math.abs(hash) % modulo;
};

const colors = [
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
];

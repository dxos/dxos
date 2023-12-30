//
// Copyright 2023 DXOS.org
//

import { X } from '@phosphor-icons/react';
import React from 'react';

import type { Label } from '@dxos/app-graph';
import { type KeyBinding, Keyboard } from '@dxos/keyboard';
import { Button, DensityProvider, useTranslation } from '@dxos/react-ui';
import { fixedBorder, groupSurface, mx } from '@dxos/react-ui-theme';

import { Key } from './ShortcutsDialog';

export const ShortcutsHints = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation('os');

  // TODO(burdon): Display by context/weight/cycle.
  const defaults = ['meta+k', 'meta+/', 'meta+,'];
  const bindings = Keyboard.singleton.getBindings();
  const hints = bindings.filter((binding) => defaults.includes(binding.binding));

  // TODO(burdon): Factor out.
  // TODO(burdon): How to access all translations across plugins?
  const toString = (label: Label) => (Array.isArray(label) ? t(...label) : label);

  const Shortcut = ({ binding }: { binding: KeyBinding }) => {
    return (
      <div role='none' className='flex items-center gap-2'>
        <Key binding={binding.binding} />
        <span className='text-sm'>{toString(binding.data)}</span>
      </div>
    );
  };

  return (
    <DensityProvider density='fine'>
      <div className={mx('flex items-center border rounded m-2 px-2 gap-4', fixedBorder, groupSurface)}>
        {hints.map((binding) => (
          <Shortcut key={binding.binding} binding={binding} />
        ))}
        <Button variant='ghost' classNames='p-0 cursor-pointer' onClick={onClose}>
          <X />
        </Button>
      </div>
    </DensityProvider>
  );
};

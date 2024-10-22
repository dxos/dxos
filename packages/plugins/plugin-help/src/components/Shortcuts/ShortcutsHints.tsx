//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type KeyBinding, Keyboard } from '@dxos/keyboard';
import { Button, Icon, toLocalizedString, useTranslation } from '@dxos/react-ui';

import { Key } from './Key';

export const ShortcutsHints = ({ onClose }: { onClose?: () => void }) => {
  const { t } = useTranslation('os');

  // TODO(burdon): Display by context/weight/cycle.
  const defaults = ['meta+k', 'meta+/', 'meta+,'];
  const bindings = Keyboard.singleton.getBindings();
  const hints = bindings.filter((binding) => defaults.includes(binding.shortcut));

  const Shortcut = ({ binding }: { binding: KeyBinding }) => {
    return (
      <div role='none' className='flex items-center gap-2'>
        <Key binding={binding.shortcut} />
        <span className='text-sm'>{toLocalizedString(binding.data, t)}</span>
      </div>
    );
  };

  return (
    <div role='none' className='flex px-2 gap-4'>
      {hints.map((binding) => (
        <Shortcut key={binding.shortcut} binding={binding} />
      ))}
      {onClose && (
        <Button variant='ghost' classNames='p-0 cursor-pointer' onClick={onClose}>
          <Icon icon='ph--x--regular' size={4} />
        </Button>
      )}
    </div>
  );
};

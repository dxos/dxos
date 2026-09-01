//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type HotkeyCommand, useActiveHotkeys } from '@dxos/react-focus';
import { IconButton, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { osTranslations } from '@dxos/ui-theme';

import { Key } from './Key';

const Shortcut = ({ binding }: { binding: HotkeyCommand }) => {
  const { t } = useTranslation(osTranslations);
  return (
    <div className='flex items-center gap-2 whitespace-nowrap'>
      <Key binding={binding.hotkey} />
      <span className='text-sm'>{toLocalizedString(binding.label ?? binding.hotkey, t)}</span>
    </div>
  );
};

export const ShortcutsHints = ({ onClose }: { onClose?: () => void }) => {
  // TODO(burdon): Display by context/weight/cycle.
  const defaults = ['meta+k', 'meta+/', 'meta+,'];
  const bindings = useActiveHotkeys();
  const hints = bindings.filter((binding) => defaults.includes(binding.hotkey));

  return (
    <div className='flex overflow-hidden px-2 gap-4'>
      {hints.map((binding) => (
        <Shortcut key={binding.id} binding={binding} />
      ))}
      {onClose && (
        <IconButton
          icon='ph--x--regular'
          size={4}
          label='Close'
          iconOnly
          noTooltip
          variant='ghost'
          classNames='p-0 cursor-pointer'
          onClick={onClose}
        />
      )}
    </div>
  );
};

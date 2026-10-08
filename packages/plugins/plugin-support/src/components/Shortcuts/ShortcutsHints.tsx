//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type HotkeyCommand, useActiveHotkeys } from '@dxos/react-focus';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Theme from '@dxos/react-ui/Theme';
import { osTranslations } from '@dxos/ui-theme';

import { Key } from './Key.tsx';

const Shortcut = ({ binding }: { binding: HotkeyCommand }) => {
  const { t } = Hooks.useTranslation(osTranslations);
  return (
    <Layout.Flex align='center' gap='sm' classNames='whitespace-nowrap'>
      <Key binding={binding.hotkey} />
      <span className='text-sm'>{Theme.toLocalizedString(binding.label ?? binding.hotkey, t)}</span>
    </Layout.Flex>
  );
};

export const ShortcutsHints = ({ onClose }: { onClose?: () => void }) => {
  // TODO(burdon): Display by context/weight/cycle.
  const defaults = ['meta+k', 'meta+/', 'meta+,'];
  const bindings = useActiveHotkeys();
  const hints = bindings.filter((binding) => defaults.includes(binding.hotkey));

  return (
    <Layout.Flex gap='lg' classNames='overflow-hidden px-2'>
      {hints.map((binding) => (
        <Shortcut key={binding.id} binding={binding} />
      ))}
      {onClose && (
        <Button.Root
          icon='ph--x--regular'
          iconSize='md'
          label='Close'
          iconOnly
          showTooltip={false}
          variant='ghost'
          classNames='p-0 cursor-pointer'
          onClick={onClose}
        />
      )}
    </Layout.Flex>
  );
};

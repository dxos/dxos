//
// Copyright 2024 DXOS.org
//

import React, { Fragment } from 'react';

import { useActiveHotkeys } from '@dxos/react-focus';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Theme from '@dxos/react-ui/Theme';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { Key } from './Key.tsx';

export const ShortcutsList = () => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  // TODO(burdon): Get shortcuts from TextEditor.
  // A command registered without a label is shown by its shortcut rather than dropped.
  const label = (binding: { label?: string; hotkey: string }) =>
    Theme.toLocalizedString(binding.label ?? binding.hotkey, t);
  const bindings = [...useActiveHotkeys()].sort((a, b) =>
    label(a)?.toLowerCase().localeCompare(label(b)?.toLowerCase()),
  );

  return (
    <dl className={mx('w-fit grid grid-cols-[min-content_minmax(12rem,1fr)] gap-2 my-3 text-fg-subtle select-none')}>
      {bindings.map((binding) => (
        <Fragment key={binding.id}>
          <Key binding={binding.hotkey} />
          <span role='definition' className='ms-4' aria-labelledby={binding.hotkey}>
            {label(binding)}
          </span>
        </Fragment>
      ))}
    </dl>
  );
};

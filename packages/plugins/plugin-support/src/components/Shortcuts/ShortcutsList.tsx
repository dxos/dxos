//
// Copyright 2024 DXOS.org
//

import React, { Fragment } from 'react';

import { keySymbols, useActiveHotkeys } from '@dxos/react-focus';
import { toLocalizedString, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

export const ShortcutsList = () => {
  const { t } = useTranslation(meta.profile.key);
  // TODO(burdon): Get shortcuts from TextEditor.
  // A command registered without a label is shown by its shortcut rather than dropped.
  const label = (binding: { label?: string; hotkey: string }) => toLocalizedString(binding.label ?? binding.hotkey, t);
  const bindings = [...useActiveHotkeys()].sort((a, b) =>
    label(a)?.toLowerCase().localeCompare(label(b)?.toLowerCase()),
  );

  return (
    <dl className={mx('w-fit grid grid-cols-[min-content_minmax(12rem,1fr)] gap-2 my-3 text-subdued select-none')}>
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

export const Key = ({ binding }: { binding: string }) => {
  return (
    <span role='term' className='inline-flex gap-1' aria-label={binding} id={binding}>
      {keySymbols(binding).map((c, i) => (
        <span
          key={i}
          className='flex w-[24px] h-[24px] justify-center items-center rounded-sm bg-input-surface text-base-fg'
        >
          {c}
        </span>
      ))}
    </span>
  );
};

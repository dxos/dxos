//
// Copyright 2024 DXOS.org
//

import React, { Fragment } from 'react';

import { keySymbols, Keyboard } from '@dxos/keyboard';
import { toLocalizedString, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

export const ShortcutsList = () => {
  const { t } = useTranslation(meta.id);
  const bindings = Keyboard.singleton.getBindings();

  // TODO(burdon): Get shortcuts from TextEditor.
  bindings.sort((a, b) => {
    return toLocalizedString(a.data, t)?.toLowerCase().localeCompare(toLocalizedString(b.data, t)?.toLowerCase());
  });

  return (
    <dl className={mx('w-fit grid grid-cols-[min-content_minmax(12rem,1fr)] gap-2 my-4 text-subdued select-none')}>
      {bindings.map((binding, i) => (
        <Fragment key={i}>
          <Key binding={binding.shortcut} />
          <span role='definition' className='ms-4' aria-labelledby={binding.shortcut}>
            {toLocalizedString(binding.data, t)}
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

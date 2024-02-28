//
// Copyright 2024 DXOS.org
//

import React, { Fragment } from 'react';

import { Keyboard } from '@dxos/keyboard';
import { toLocalizedString, useTranslation } from '@dxos/react-ui';

import { Key } from './Key';
import { HELP_PLUGIN } from '../../meta';

export const ShortcutsList = () => {
  const { t } = useTranslation(HELP_PLUGIN);
  const bindings = Keyboard.singleton.getBindings();

  // TODO(burdon): Get shortcuts from TextEditor.
  bindings.sort((a, b) => {
    return toLocalizedString(a.data, t)?.toLowerCase().localeCompare(toLocalizedString(b.data, t)?.toLowerCase());
  });

  return (
    <dl className='is-fit grid grid-cols-[min-content_minmax(12rem,1fr)] gap-2 mlb-4'>
      {bindings.map((binding, i) => (
        <Fragment key={i}>
          <Key binding={binding.shortcut} />
          <span role='definition' aria-labelledby={binding.shortcut}>
            {toLocalizedString(binding.data, t)}
          </span>
        </Fragment>
      ))}
    </dl>
  );
};

//
// Copyright 2024 DXOS.org
//

import React, { Fragment } from 'react';

import { Keyboard } from '@dxos/keyboard';
import { useTranslation } from '@dxos/react-ui';

import { Key } from './Key';
import { HELP_PLUGIN } from '../../meta';

export const ShortcutsList = () => {
  const { t } = useTranslation(HELP_PLUGIN);
  const bindings = Keyboard.singleton.getBindings();

  // TODO(burdon): Factor out.
  const toString = (label: any) => (Array.isArray(label) ? t(label[0], label[1]) : label);

  // TODO(burdon): Get shortcuts from TextEditor.
  bindings.sort((a, b) => {
    return toString(a.data)?.toLowerCase().localeCompare(toString(b.data)?.toLowerCase());
  });

  return (
    <dl className='is-fit grid grid-cols-[min-content_minmax(12rem,1fr)] gap-2 mlb-4'>
      {bindings.map((binding, i) => (
        <Fragment key={i}>
          <Key binding={binding.shortcut} />
          <span role='definition' aria-labelledby={binding.shortcut}>
            {toString(binding.data)}
          </span>
        </Fragment>
      ))}
    </dl>
  );
};

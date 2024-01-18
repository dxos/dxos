//
// Copyright 2024 DXOS.org
//

import React, { Fragment } from 'react';

import type { Label } from '@dxos/app-graph';
import { Keyboard } from '@dxos/keyboard';
import { useTranslation } from '@dxos/react-ui';

import { Key } from './Key';
import { HELP_PLUGIN } from '../../meta';

export const ShortcutsList = () => {
  const { t } = useTranslation(HELP_PLUGIN);
  const bindings = Keyboard.singleton.getBindings();

  // TODO(burdon): Factor out.
  const toString = (label: Label) => (Array.isArray(label) ? t(...label) : label);

  // TODO(burdon): Get shortcuts from TextEditor.
  bindings.sort((a, b) => {
    return toString(a.data)?.toLowerCase().localeCompare(toString(b.data)?.toLowerCase());
  });

  return (
    <dl className='is-fit grid grid-cols-[fit-content(100%)_fit-content(100%)] gap-2 mlb-4'>
      {bindings.map((binding, i) => (
        <Fragment key={i}>
          <Key binding={binding.shortcut} />
          <span role='definition' aria-labelledby={binding.shortcut} className='truncate'>
            {toString(binding.data as Label)}
          </span>
        </Fragment>
      ))}
    </dl>
  );
};

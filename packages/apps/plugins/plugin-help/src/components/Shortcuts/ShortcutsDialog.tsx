//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type Label } from '@dxos/app-graph';
import { Keyboard, keySymbols } from '@dxos/keyboard';
import { Button, Dialog, useTranslation } from '@dxos/react-ui';

import { shortcutKey } from './styles';

export const Key = ({ binding }: { binding: string }) => {
  return (
    <div className='flex gap-1'>
      {keySymbols(binding).map((c, i) => (
        <span key={i} className={shortcutKey}>
          {c}
        </span>
      ))}
    </div>
  );
};

export const ShortcutsDialogContent = () => {
  const { t } = useTranslation('os');

  // TODO(burdon): Factor out.
  // TODO(burdon): How to access all translations across plugins?
  const toString = (label: Label) => (Array.isArray(label) ? t(...label) : label);

  // TODO(burdon): Get shortcuts from TextEditor.
  const bindings = Keyboard.singleton.getBindings();
  bindings.sort((a, b) => {
    return toString(a.data)?.toLowerCase().localeCompare(toString(b.data)?.toLowerCase());
  });

  return (
    <Dialog.Content classNames={['max-bs-[40rem] md:max-is-[30rem] overflow-hidden']}>
      <Dialog.Title>{t('shortcuts dialog title', { ns: 'os' })}</Dialog.Title>

      <div className='grow overflow-y-auto py-2'>
        <table className='table-fixed border-collapse my-4'>
          <tbody>
            {bindings.map((binding, i) => (
              <tr key={i}>
                <td className='p-1 w-[120px]'>
                  <Key binding={binding.binding} />
                </td>
                <td className='p-1'>
                  <span className='grow truncate'>{toString(binding.data as Label)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog.Close asChild>
        <Button variant='primary' classNames='mbs-2'>
          {t('close label', { ns: 'os' })}
        </Button>
      </Dialog.Close>
    </Dialog.Content>
  );
};

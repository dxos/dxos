//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { type Key } from '@dxos/echo';
import { Listbox } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';

import { meta } from '#meta';

export type ForeignKeysProps = {
  keys: Key.ForeignKey[];
  onDelete?: (key: Key.ForeignKey) => void;
};

// TODO(wittjosiah): This is a clone of `TokenManager`. Consider a form variant for arrays of read-only objects.
export const ForeignKeys = ({ keys, onDelete }: ForeignKeysProps) => {
  return (
    <Listbox.Root items={keys.map((key) => ({ value: key.id, label: key.source, description: key.id }))}>
      <Listbox.Content classNames='gap-2'>
        {keys.map((key) => (
          <KeyItem key={key.id} forignKey={key} onDelete={onDelete} />
        ))}
      </Listbox.Content>
    </Listbox.Root>
  );
};

type KeyItemProps = {
  forignKey: Key.ForeignKey;
  onDelete?: (key: Key.ForeignKey) => void;
};

const KeyItem = ({ forignKey, onDelete }: KeyItemProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);

  const handleDelete = useCallback(() => {
    onDelete?.(forignKey);
  }, [forignKey, onDelete]);

  return (
    <Listbox.Item id={forignKey.id}>
      <Listbox.ItemText />
      <Listbox.ItemDescription />
      <Button.Root
        iconOnly
        icon='ph--x--regular'
        variant='ghost'
        label={t('delete-key.button')}
        onClick={handleDelete}
      />
    </Listbox.Item>
  );
};

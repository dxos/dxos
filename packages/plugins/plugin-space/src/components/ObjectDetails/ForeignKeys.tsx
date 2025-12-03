//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { type Key } from '@dxos/echo';
import { IconButton, List, ListItem, useTranslation } from '@dxos/react-ui';

import { meta } from '../../meta';

export type ForeignKeysProps = {
  keys: Key.ForeignKey[];
  onDelete?: (key: Key.ForeignKey) => void;
};

// TODO(wittjosiah): This is a clone of `TokenManager`. Consider a form variant for arrays of read-only objects.
export const ForeignKeys = ({ keys, onDelete }: ForeignKeysProps) => {
  return (
    <List classNames='flex flex-col gap-2'>
      {keys.map((key) => (
        <KeyItem key={key.id} forignKey={key} onDelete={onDelete} />
      ))}
    </List>
  );
};

type KeyItemProps = {
  forignKey: Key.ForeignKey;
  onDelete?: (key: Key.ForeignKey) => void;
};

const KeyItem = ({ forignKey, onDelete }: KeyItemProps) => {
  const { t } = useTranslation(meta.id);

  const handleDelete = useCallback(() => {
    onDelete?.(forignKey);
  }, [forignKey, onDelete]);

  return (
    <ListItem.Root classNames='pli-2'>
      <ListItem.Heading classNames='flex flex-col grow truncate'>
        <div>{forignKey.source}</div>
        <div className='text-description text-sm truncate'>{forignKey.id}</div>
      </ListItem.Heading>
      <ListItem.Endcap>
        <IconButton iconOnly icon='ph--x--regular' variant='ghost' label={t('delete key')} onClick={handleDelete} />
      </ListItem.Endcap>
    </ListItem.Root>
  );
};

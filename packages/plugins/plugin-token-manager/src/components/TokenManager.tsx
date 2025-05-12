//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { IconButton, List, ListItem, useTranslation } from '@dxos/react-ui';
import { type DataType } from '@dxos/schema';

import { TOKEN_MANAGER_PLUGIN } from '../meta';

export type TokenManagerProps = {
  tokens: DataType.AccessToken[];
  onDelete?: (token: DataType.AccessToken) => void;
};

export const TokenManager = ({ tokens, onDelete }: TokenManagerProps) => {
  return (
    <List classNames='space-y-2'>
      {tokens.map((token) => (
        <TokenItem key={token.id} token={token} onDelete={onDelete} />
      ))}
    </List>
  );
};

type TokenItemProps = {
  token: DataType.AccessToken;
  onDelete?: (token: DataType.AccessToken) => void;
};

const TokenItem = ({ token, onDelete }: TokenItemProps) => {
  const { t } = useTranslation(TOKEN_MANAGER_PLUGIN);

  const handleDelete = useCallback(() => {
    onDelete?.(token);
  }, [token, onDelete]);

  return (
    <ListItem.Root>
      <ListItem.Heading classNames='grow truncate'>
        <div>{token.note}</div>
        <div className='text-description text-sm truncate'>{token.source}</div>
      </ListItem.Heading>
      <ListItem.Endcap>
        <IconButton iconOnly icon='ph--x--regular' variant='ghost' label={t('delete token')} onClick={handleDelete} />
      </ListItem.Endcap>
    </ListItem.Root>
  );
};

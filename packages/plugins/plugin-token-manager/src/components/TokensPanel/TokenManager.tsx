//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { IconButton, List, ListItem, useTranslation } from '@dxos/react-ui';
import { type AccessToken } from '@dxos/types';

import { meta } from '../../meta';

export type TokenManagerProps = {
  tokens: AccessToken.AccessToken[];
  onDelete?: (token: AccessToken.AccessToken) => void;
};

export const TokenManager = ({ tokens, onDelete }: TokenManagerProps) => {
  if (!tokens.length) {
    return null;
  }

  return (
    <List>
      {tokens.map((token) => (
        <TokenListItem key={token.id} token={token} onDelete={onDelete} />
      ))}
    </List>
  );
};

type TokenListItemProps = {
  token: AccessToken.AccessToken;
  onDelete?: (token: AccessToken.AccessToken) => void;
};

const TokenListItem = ({ token, onDelete }: TokenListItemProps) => {
  const { t } = useTranslation(meta.id);

  const handleDelete = useCallback(() => {
    onDelete?.(token);
  }, [token, onDelete]);

  return (
    <ListItem.Root>
      <ListItem.Heading classNames='grow truncate'>{token.note}</ListItem.Heading>
      <div className='flex items-center text-description text-sm truncate'>{token.source}</div>
      <ListItem.Endcap>
        <IconButton iconOnly icon='ph--x--regular' variant='ghost' label={t('delete token')} onClick={handleDelete} />
      </ListItem.Endcap>
    </ListItem.Root>
  );
};

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
    <ListItem.Root classNames='grid grid-cols-[1fr_min-content]'>
      <div className='flex flex-col'>
        <ListItem.Heading>{token.source}</ListItem.Heading>
        <p className='text-description'>{token.account}</p>
        <p className='text-description'>{token.note}</p>
      </div>
      <ListItem.Endcap>
        <IconButton
          iconOnly
          icon='ph--x--regular'
          variant='ghost'
          label={t('delete-token.menu')}
          onClick={handleDelete}
        />
      </ListItem.Endcap>
    </ListItem.Root>
  );
};

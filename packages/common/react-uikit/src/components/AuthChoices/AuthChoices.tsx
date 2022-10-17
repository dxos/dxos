//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Button } from '@dxos/react-ui';

import { useTranslation } from '../../translations';

export interface AuthChoicesProps {
  create?: boolean
  recover?: boolean
  inviteDevice?: boolean
}

export const AuthChoices = (props: AuthChoicesProps) => {
  const { t } = useTranslation();
  return <section><Button>{t('create profile action')}</Button></section>;
};

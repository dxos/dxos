//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';
import { baseSurface, descriptionText, mx } from '@dxos/react-ui-theme';

import { SPACE_PLUGIN } from '../meta';
import type { CollectionType } from '../types';

export const CollectionContainer = ({ collection, role }: { collection: CollectionType; role: string }) => {
  const { t } = useTranslation(SPACE_PLUGIN);

  return (
    <StackItem.Content
      toolbar={false}
      role={role}
      classNames={[baseSurface, 'min-bs-14 grid place-content-center p-8']}
      {...(role === 'article' && { 'data-testid': 'composer.firstRunMessage' })}
    >
      <p
        role='alert'
        className={mx(
          descriptionText,
          'border border-dashed border-unAccent rounded-lg p-8 font-normal text-lg max-is-96 break-words',
        )}
      >
        {collection.name ?? t('unnamed collection label')}
      </p>
    </StackItem.Content>
  );
};

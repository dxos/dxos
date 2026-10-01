//
// Copyright 2026 DXOS.org
//

import React, { PropsWithChildren } from 'react';

import { Next, useTranslation } from '@dxos/react-ui';
import { getHostPlatform, isTauri } from '@dxos/util';

import { translationKey } from '#translations';

import { SearchList, SearchListRootProps } from '../SearchList/index.ts';

export type SearchPanelProps = PropsWithChildren<SearchListRootProps>;

export const SearchPanel = ({ children, ...props }: SearchPanelProps) => {
  const { t } = useTranslation(translationKey);
  const autoFocus = !isTauri() || getHostPlatform() !== 'ios';

  return (
    <SearchList.Root {...props}>
      <Next.Panel.Root classNames='dx-expand dx-base-surface'>
        <Next.Panel.Body asChild>
          <SearchList.Content>{children}</SearchList.Content>
        </Next.Panel.Body>
        <Next.Panel.Footer>
          <Next.Toolbar.Root>
            <SearchList.Input placeholder={t('search.placeholder')} autoFocus={autoFocus} />
          </Next.Toolbar.Root>
        </Next.Panel.Footer>
      </Next.Panel.Root>
    </SearchList.Root>
  );
};

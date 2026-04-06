//
// Copyright 2026 DXOS.org
//

import React, { PropsWithChildren } from 'react';

import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { getHostPlatform, isTauri } from '@dxos/util';

import { SearchList, SearchListRootProps } from '../SearchList';
import { translationKey } from '../../translations';

export type SearchPanelProps = PropsWithChildren<SearchListRootProps>;

export const SearchPanel = ({ children, ...props }: SearchPanelProps) => {
  const { t } = useTranslation(translationKey);
  const autoFocus = !isTauri() || getHostPlatform() !== 'ios';

  return (
    <SearchList.Root {...props}>
      <Panel.Root className='dx-container bg-base-surface'>
        <Panel.Content asChild>
          <SearchList.Content>{children}</SearchList.Content>
        </Panel.Content>
        <Panel.Statusbar asChild>
          <Toolbar.Root>
            <SearchList.Input placeholder={t('search.placeholder')} autoFocus={autoFocus} />
          </Toolbar.Root>
        </Panel.Statusbar>
      </Panel.Root>
    </SearchList.Root>
  );
};

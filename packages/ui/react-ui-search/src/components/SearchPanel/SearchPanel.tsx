//
// Copyright 2026 DXOS.org
//

import React, { PropsWithChildren } from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { getHostPlatform, isTauri } from '@dxos/util';

import { translationKey } from '#translations';

import { SearchList, SearchListRootProps } from '../SearchList/index.ts';

export type SearchPanelProps = PropsWithChildren<SearchListRootProps>;

export const SearchPanel = ({ children, ...props }: SearchPanelProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const autoFocus = !isTauri() || getHostPlatform() !== 'ios';

  return (
    <SearchList.Root {...props}>
      <Panel.Root classNames='dx-expand dx-base-surface'>
        <Panel.Body asChild>
          <SearchList.Content>{children}</SearchList.Content>
        </Panel.Body>
        <Panel.Footer>
          <Toolbar.Root>
            <SearchList.Input placeholder={t('search.placeholder')} autoFocus={autoFocus} />
          </Toolbar.Root>
        </Panel.Footer>
      </Panel.Root>
    </SearchList.Root>
  );
};

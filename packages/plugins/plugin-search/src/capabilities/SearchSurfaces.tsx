//
// Copyright 2025 DXOS.org
//

import React, { type ComponentProps } from 'react';

import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { type Space } from '@dxos/react-client/echo';

import { SearchArticle, SearchDialog } from '#containers';
import { SearchContextProvider } from '#hooks';

export type SearchDialogSurfaceProps = {
  props: ComponentProps<typeof SearchDialog>;
};

/** Search is scoped to the active space, so each surface resolves it before mounting the provider. */
export const SearchDialogSurface = ({ props }: SearchDialogSurfaceProps) => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }

  return (
    <SearchContextProvider>
      <SearchDialog {...props} space={space} />
    </SearchContextProvider>
  );
};

export const SearchInputSurface = () => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }

  return (
    <SearchContextProvider>
      <SearchArticle space={space} />
    </SearchContextProvider>
  );
};

export type SearchCompanionSurfaceProps = {
  space: Space;
};

export const SearchCompanionSurface = ({ space }: SearchCompanionSurfaceProps) => {
  if (!space) {
    return null;
  }

  return (
    <SearchContextProvider>
      <SearchArticle space={space} />
    </SearchContextProvider>
  );
};

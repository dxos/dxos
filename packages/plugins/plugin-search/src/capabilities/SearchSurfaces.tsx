//
// Copyright 2025 DXOS.org
//

import React, { type ComponentProps } from 'react';

import * as Hooks from '@dxos/app-toolkit/Hooks';
import { type Space, useSpace } from '@dxos/react-client/echo';

import { SearchArticle, SearchDialog } from '#containers';
import { SearchContextProvider } from '#hooks';

export type SearchDialogSurfaceProps = {
  /** Absent when `OpenSearch` opened the dialog, which passes none. */
  props?: ComponentProps<typeof SearchDialog> & {
    /** The space to search, when the caller names one (`SearchOperation.SelectObject`). */
    spaceId?: string;
  };
};

/** Search is scoped to one space, so each surface resolves it before mounting the provider. */
export const SearchDialogSurface = ({ props: { spaceId, ...props } = {} }: SearchDialogSurfaceProps) => {
  const activeSpace = Hooks.useActiveSpace();
  const namedSpace = useSpace(spaceId);
  const space = spaceId ? namedSpace : activeSpace;
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
  const space = Hooks.useActiveSpace();
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

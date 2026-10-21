//
// Copyright 2025 DXOS.org
//

import React, { type ComponentProps, useEffect } from 'react';

import * as Hooks from '@dxos/app-toolkit/Hooks';
import { type Space, useSpace } from '@dxos/react-client/echo';

import { SearchArticle, SearchDialog } from '#containers';
import { SearchContextProvider } from '#hooks';

export type SearchDialogSurfaceProps = {
  props?: ComponentProps<typeof SearchDialog> & {
    spaceId?: string;
  };
};

export const SearchDialogSurface = ({ props: { spaceId, ...props } = {} }: SearchDialogSurfaceProps) => {
  const activeSpace = Hooks.useActiveSpace();
  const namedSpace = useSpace(spaceId);
  const space = spaceId ? namedSpace : activeSpace;
  // With no space the dialog never mounts to settle a picker's handle, so the caller would wait forever.
  useEffect(() => {
    if (!space) {
      props.handle?.dismiss();
    }
  }, [space, props.handle]);
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

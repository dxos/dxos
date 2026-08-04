//
// Copyright 2023 DXOS.org
//

import { createContext } from '@radix-ui/react-context';

// Kept out of `Avatar.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export type AvatarContextValue = {
  labelId: string;
  descriptionId: string;
};

export const AVATAR_NAME = 'Avatar';
export const [AvatarProvider, useAvatarContext] = createContext<AvatarContextValue>(AVATAR_NAME);

//
// Copyright 2024 DXOS.org
//

import { createContext, useContext } from 'react';

import { type Space, type SpaceId } from '@dxos/client/echo';
import { raise } from '@dxos/debug';

export type ClientStory = {
  index?: number;
  spaceId?: SpaceId;

  /** @deprecated Use spaceId */
  space?: Space;
};

export const ClientStory = createContext<ClientStory | undefined>(undefined);

export const useClientStory = (): ClientStory => {
  return useContext(ClientStory) ?? raise(new Error('Missing ClientStory'));
};

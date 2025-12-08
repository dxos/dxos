//
// Copyright 2024 DXOS.org
//

import { createContext, useContext } from 'react';

import { type Space } from '@dxos/client/echo';
import { raise } from '@dxos/debug';

export type ClientStory = {
  space?: Space;
};

// TODO(wittjosiah): Add to multi-client as well.
export const ClientStory = createContext<ClientStory | undefined>(undefined);

/**
 * @deprecated Use default space to simplify.
 */
export const useClientProvider = (): ClientStory => {
  return useContext(ClientStory) ?? raise(new Error('Missing ClientStory'));
};

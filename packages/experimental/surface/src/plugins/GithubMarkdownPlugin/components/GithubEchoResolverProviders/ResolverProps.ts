//
// Copyright 2023 DXOS.org
//

import { Dispatch, SetStateAction } from 'react';

import { Document } from '@braneframe/types';
import { Space } from '@dxos/client';

export type SpaceResolverProps = {
  space: Space | null;
  setSpace: Dispatch<SetStateAction<Space | null>>;
  source?: string;
  id?: string;
  identityHex?: string;
};

export type DocumentResolverProps = {
  document: Document | null;
  setDocument: Dispatch<SetStateAction<Document | null>>;
};

export type ResolverProps = SpaceResolverProps & DocumentResolverProps;

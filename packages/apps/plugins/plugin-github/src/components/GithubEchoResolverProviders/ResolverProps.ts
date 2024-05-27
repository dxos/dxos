//
// Copyright 2023 DXOS.org
//

import { type Dispatch, type SetStateAction } from 'react';

import { type DocumentType } from '@braneframe/types';
import { type Space } from '@dxos/react-client/echo';

export type SpaceResolverProps = {
  space: Space | null;
  setSpace: Dispatch<SetStateAction<Space | null>>;
  source?: string;
  id?: string;
  identityHex?: string;
};

export type DocumentResolverProps = {
  document: DocumentType | null;
  setDocument: Dispatch<SetStateAction<DocumentType | null>>;
};

export type ResolverProps = SpaceResolverProps & DocumentResolverProps;

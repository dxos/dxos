//
// Copyright 2023 DXOS.org
//

import { Dispatch, SetStateAction } from 'react';

import { Space } from '@dxos/client';

export type ResolverProps = { source: string; id: string; setNextSpace: Dispatch<SetStateAction<Space | null>> };

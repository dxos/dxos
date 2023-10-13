//
// Copyright 2023 DXOS.org
//

import { type Context, createContext } from 'react';

import { type SectionType } from './Stack';

export const StackSectionContext: Context<{ section?: SectionType }> = createContext({});

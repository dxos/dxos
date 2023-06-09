//
// Copyright 2023 DXOS.org
//

import { Context, createContext } from 'react';

import { SectionType } from './Stack';

export const StackSectionContext: Context<{ section?: SectionType }> = createContext({});

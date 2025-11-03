//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { raise } from '@dxos/debug';

import { HelpContext } from '../types';

export const useHelp = () => useContext(HelpContext) ?? raise(new Error('Missing HelpContext'));

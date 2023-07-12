//
// Copyright 2023 DXOS.org
//

import { createStore } from '@dxos/observable-object';

import { StackSectionChooser, StackSectionCreator } from './props';

export const stackSectionCreators = createStore<StackSectionCreator[]>([]);
export const stackSectionChoosers = createStore<StackSectionChooser[]>([]);

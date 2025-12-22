//
// Copyright 2023 DXOS.org
//

import { type ClassNameValue } from '@dxos/ui-types';

// TODO(burdon): Move to @dxos/ui-types
export type ThemedClassName<P = {}> = Omit<P, 'className'> & { classNames?: ClassNameValue };

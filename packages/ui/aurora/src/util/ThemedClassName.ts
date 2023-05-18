//
// Copyright 2023 DXOS.org
//

import { ClassNameValue } from '@dxos/aurora-types';

export type ThemedClassName<P> = Omit<P, 'className'> & { classNames?: ClassNameValue };

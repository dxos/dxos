//
// Copyright 2023 DXOS.org
//

import { type ClassNameValue } from '@dxos/react-ui-types';

export type ThemedClassName<P> = Omit<P, 'className'> & { classNames?: ClassNameValue };

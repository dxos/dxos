//
// Copyright 2023 DXOS.org
//

import { Scope } from '@radix-ui/react-context';

export type ScopedProps<P> = P & { __scopeSelect?: Scope };

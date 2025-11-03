//
// Copyright 2024 DXOS.org
//

import { webcrypto } from '#subtle';

export const randomUUID = (): string => webcrypto.randomUUID();

//
// Copyright 2022 DXOS.org
//

import { signal } from '@preact/signals';

import { constructRegisterSignalApi } from './common';

export const registerSignalFactory = constructRegisterSignalApi(signal);

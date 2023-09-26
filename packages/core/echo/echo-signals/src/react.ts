//
// Copyright 2022 DXOS.org
//

import { signal } from '@preact/signals-react';

import { constructRegisterSignalApi } from './common';

export const registerSignalFactory = constructRegisterSignalApi(signal);

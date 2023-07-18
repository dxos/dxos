//
// Copyright 2022 DXOS.org
//

import { signal } from '@preact/signals-core';

import { constructRegisterSignalFactory } from './common';

export const registerSignalFactory = constructRegisterSignalFactory(signal);

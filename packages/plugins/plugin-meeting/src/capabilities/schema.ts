//
// Copyright 2023 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AnchoredTo } from '@dxos/types';

import { Meeting } from '#types';

export const Schema = AppCapability.schema([Meeting.Meeting, AnchoredTo.AnchoredTo]);

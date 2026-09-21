//
// Copyright 2023 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AnchoredTo, Message, Thread } from '@dxos/types';

export const Schema = AppCapability.schema([AnchoredTo.AnchoredTo, Message.Message, Thread.Thread]);

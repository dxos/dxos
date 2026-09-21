//
// Copyright 2023 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { Channel, Message, Thread } from '@dxos/types';

export const Schema = AppCapability.schema([Channel.Channel, Message.Message, Thread.Thread]);

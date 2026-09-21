//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { Ibkr } from '#types';

export const Schema = AppCapability.schema([Ibkr.Portfolio, Ibkr.Report, Ibkr.Instrument, Ibkr.Lot]);

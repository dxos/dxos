//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { Chess, ChessPositionIndex, PlayerReview } from '#types';

export const Schema = AppCapability.schema([Chess.State, ChessPositionIndex.PositionIndex, PlayerReview.Review]);

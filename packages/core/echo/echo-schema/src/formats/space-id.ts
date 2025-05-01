//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { SpaceId } from '@dxos/keys';

export const SpaceIdSchema: Schema.Schema<SpaceId, string> = Schema.String.pipe(Schema.filter(SpaceId.isValid));

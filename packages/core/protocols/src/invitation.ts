//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { SchemaEx } from '@dxos/effect';

// TODO(burdon): Use uniformly for processing HTTP params.
export const InvitationUrl = Schema.Struct({
  accessToken: Schema.String, // TODO(burdon): Remove.
  deviceInvitationCode: Schema.String.pipe(SchemaEx.ParamKeyAnnotation({ key: 'deviceInvitationCode' })),
  spaceInvitationCode: Schema.String.pipe(SchemaEx.ParamKeyAnnotation({ key: 'spaceInvitationCode' })),
});

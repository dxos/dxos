//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { ParamKeyAnnotation } from '@dxos/effect';

// TODO(burdon): Use uniformly for processing HTTP params.
export const InvitationUrl = Schema.Struct({
  accessToken: Schema.String, // TODO(burdon): Remove.
  deviceInvitationCode: Schema.String.pipe(ParamKeyAnnotation({ key: 'deviceInvitationCode' })),
  spaceInvitationCode: Schema.String.pipe(ParamKeyAnnotation({ key: 'spaceInvitationCode' })),
});

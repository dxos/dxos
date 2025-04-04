//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';

import { ParamKeyAnnotation } from '@dxos/effect';

// TODO(burdon): Use uniformly for processing HTTP params.
export const InvitationUrl = S.Struct({
  accessToken: S.String, // TODO(burdon): Remove.
  deviceInvitationCode: S.String.pipe(ParamKeyAnnotation({ key: 'deviceInvitationCode' })),
  spaceInvitationCode: S.String.pipe(ParamKeyAnnotation({ key: 'spaceInvitationCode' })),
});

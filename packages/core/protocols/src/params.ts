//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';

import { ParamKeyAnnotation } from '@dxos/util';

// TODO(burdon): Use uniformly for processing params.
export const InvitationUrl = S.Struct({
  accessToken: S.String, // TODO(burdon): Remove.
  deviceInvitationCode: S.String.pipe(ParamKeyAnnotation('deviceInvitationCode')),
  spaceInvitationCode: S.String.pipe(ParamKeyAnnotation('spaceInvitationCode')),
});

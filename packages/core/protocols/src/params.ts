//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { ParamKeyAnnotation } from '@dxos/util';

// TODO(burdon): Use uniformly for processing params.
export const InvitationUrl = S.Struct({
  accessToken: S.String,
  deviceInvitationCode: S.String.pipe(ParamKeyAnnotation('deviceInvitationCode')),
  spaceInvitationCode: S.String.pipe(ParamKeyAnnotation('spaceInvitationCode')),
});

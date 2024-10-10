//
// Copyright 2024 DXOS.org
//

import { ParamKeyAnnotation, S } from '@dxos/effect';

// TODO(burdon): Use uniformly for processing HTTP params.
export const InvitationUrl = S.Struct({
  accessToken: S.String, // TODO(burdon): Remove.
  deviceInvitationCode: S.String.pipe(ParamKeyAnnotation({ key: 'deviceInvitationCode' })),
  spaceInvitationCode: S.String.pipe(ParamKeyAnnotation({ key: 'spaceInvitationCode' })),
});

//
// Copyright 2024 DXOS.org
//

// import { Schema as S } from '@effect/schema';

// import { ParamKeyAnnotation } from '@dxos/util';

// TODO(burdon): Error (which doesn't happen in util/common/src/url.test.ts).
/*
  src/invitation.ts(12,39): error TS2345: Argument of type '<S extends Annotable.All>(self: S) => ReturnType<S["annotations"]>' is not assignable to parameter of type '(_: typeof String$) => any'.
    Types of parameters 'self' and '_' are incompatible.
      Type 'typeof String$' is not assignable to type 'All'.
        Property '[TypeId]' is missing in type 'typeof String$' but required in type 'Annotable<any, never, never, unknown>'.
*/

// TODO(burdon): Use uniformly for processing HTTP params.
// export const InvitationUrl = S.Struct({
//   accessToken: S.String, // TODO(burdon): Remove.
//   deviceInvitationCode: S.String.pipe(ParamKeyAnnotation({ key: 'deviceInvitationCode' })),
//   spaceInvitationCode: S.String.pipe(ParamKeyAnnotation({ key: 'spaceInvitationCode' })),
// });

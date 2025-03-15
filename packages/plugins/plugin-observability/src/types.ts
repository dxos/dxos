//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { OBSERVABILITY_PLUGIN } from './meta';

const Email = S.String.pipe(
  S.nonEmptyString({ message: () => 'Email is required.' }),
  S.pattern(/^(?!\.)(?!.*\.\.)([A-Z0-9_+-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i, {
    message: () => 'Invalid email address.',
  }),
);

const nonEmpty = (field: string) => S.nonEmptyString({ message: () => `${field} is required.` });
const maxLength = (field: string, length: number) => S.maxLength(length, { message: () => `${field} is too long.` });

export const UserFeedback = S.Struct({
  name: S.String.pipe(nonEmpty('Name'), maxLength('Name', 256)),
  email: Email.pipe(maxLength('Email', 256)),
  message: S.String.pipe(nonEmpty('Feedback'), maxLength('Feedback', 32_768)),
});

export type UserFeedback = S.Schema.Type<typeof UserFeedback>;

const OBSERVABILITY_ACTION = `${OBSERVABILITY_PLUGIN}/action`;
export namespace ObservabilityAction {
  export class Toggle extends S.TaggedClass<Toggle>()(`${OBSERVABILITY_ACTION}/toggle`, {
    input: S.Struct({
      state: S.optional(S.Boolean),
    }),
    output: S.Boolean,
  }) {}

  export class SendEvent extends S.TaggedClass<SendEvent>()(`${OBSERVABILITY_ACTION}/send-event`, {
    input: S.Struct({
      name: S.String,
      properties: S.optional(S.Object),
      installationId: S.optional(S.String),
      identityId: S.optional(S.String),
      timestamp: S.optional(S.Date),
    }),
    output: S.Void,
  }) {}

  export class CaptureUserFeedback extends S.TaggedClass<CaptureUserFeedback>()(
    `${OBSERVABILITY_ACTION}/capture-feedback`,
    {
      input: UserFeedback,
      output: S.Void,
    },
  ) {}
}

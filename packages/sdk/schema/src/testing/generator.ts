//
// Copyright 2024 DXOS.org
//

import { Format, S, TypedObject } from '@dxos/echo-schema';

// TODO(burdon): Replace echo-generator.
// TODO(burdon): Delete core/agent, experimental/agent-functions.

export const Org = S.Struct({
  id: S.String,
  name: S.String,
  website: Format.URL,
});

export const Contact = S.Struct({
  id: S.String,
  name: S.String,
  // TODO(burdon): Array.
  email: Format.Email,
});

export const Project = S.Struct({
  id: S.String,
  name: S.String,
});

// TODO(burdon): Use concrete type.
export const Task = S.Struct({
  id: S.String,
  // project: S.optional(ref(Project)), // TODO(burdon): Must be echo object.
  name: S.String,
  assignedTo: S.String, // TODO(burdon): Ref.
});

// TODO(burdon): Use concrete type.
export const Message = S.Struct({
  id: S.String,
  from: Format.Email,
  to: Format.Email,
  subject: S.String,
  body: S.String,
});

// TODO(burdon): Check pattern for table.
export class OrgType extends TypedObject({
  typename: 'example.com/type/Org',
  version: '0.1.0',
})(Org.fields) {}

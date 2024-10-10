//
// Copyright 2024 DXOS.org
//

import { plate } from '@dxos/plate';

import template from '../template.t';

export default template.define.script({
  content: plate/* javascript */ `
  import { Schema as S } from '@effect/schema';
  import { TypedObject } from '@dxos/echo-schema';

  export class Task extends TypedObject({ typename: 'example.Task', version: '0.1.0' })({
    title: S.String,
    completed: S.Boolean,
  }) {}
  `,
});

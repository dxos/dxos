//
// Copyright 2024 DXOS.org
//

import { plate } from '@dxos/plate';

import template from '../template.t';

export default template.define.script({
  content: plate/* javascript */ `
  import { TypedObject } from '@dxos/echo-schema';
  import * as S from '@effect/schema/Schema';

  export class Task extends TypedObject({ typename: 'example.Task', version: '0.1.0' })({
    title: S.string,
    completed: S.boolean,
  }) {}
  `,
});

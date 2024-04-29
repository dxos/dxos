import { plate } from '@dxos/plate';
import template from '../template.t';

export default template.define.text({
  content: ({ input: { schema } }) =>
    schema &&
    plate`
    import * as S from '@effect/schema/Schema';
    import { TypedObject } from '@dxos/echo-schema';

    // NOTE: Schema needs to be registered with the client before use.
    //   e.g. client.addSchema(Task);

    // export class Task extends TypedObject({ typename: 'example.Task', version: '0.1.0' })({
    //   title: S.string,
    //   completed: S.boolean,
    // }) {}
    `,
});

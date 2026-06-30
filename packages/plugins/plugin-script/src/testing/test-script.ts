//
// Copyright 2026 DXOS.org
//

import { Operation, Script } from '@dxos/compute';
import { Obj, Ref } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';

/**
 * Seeds a script and linked persistent operation for Storybook stories.
 */
export const createScript = (space: Space): Script.Script => {
  const script = Script.make({
    name: 'Test',
    source: 'export default () => 42;',
  });

  space.db.add(script);
  space.db.add(
    Obj.make(Operation.PersistentOperation, {
      [Obj.Meta]: { key: 'org.dxos.script.story-fn', version: '0.1.0' },
      name: 'Test',
      source: Ref.make(script),
    }),
  );

  return script;
};

//
// Copyright 2026 DXOS.org
//

import { Script } from '@dxos/compute';
import { Operation } from '@dxos/compute';
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
      key: 'org.dxos.script.story-fn',
      name: 'Test',
      version: '0.1.0',
      source: Ref.make(script),
    }),
  );

  return script;
};

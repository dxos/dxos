//
// Copyright 2026 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import { Script } from '@dxos/functions';
import { Operation } from '@dxos/operation';
import { type Space } from '@dxos/react-client/echo';

/**
 * Seeds a script and linked persistent operation for Storybook stories.
 */
export const createScript = (space: Space): Script.Script => {
  const script = Script.make({
    name: 'Story script',
    source: 'export default () => 42;',
  });

  space.db.add(script);
  space.db.add(
    Obj.make(Operation.PersistentOperation, {
      key: 'org.dxos.script.story-fn',
      name: 'Story script',
      version: '0.0.0',
      source: Ref.make(script),
    }),
  );

  return script;
};

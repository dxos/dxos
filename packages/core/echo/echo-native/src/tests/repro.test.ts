import { writeFileSync } from 'node:fs';
import { test } from 'vitest';

import { Filter, Query } from '@dxos/echo';
import { SpaceId } from '@dxos/keys';

import { compileQuery } from '../../../echo-sqlite/src/sql/compile.ts';

test('dump', () => {
  const spaceId = SpaceId.random();
  const compiled = compileQuery(Query.select(Filter.id('01J00000000000000000000000')).children().ast, { spaceId });
  writeFileSync(
    '/tmp/claude-0/-home-user/f06fcefd-c585-5497-9c68-4b8b8da0fcaa/scratchpad/children.sql',
    compiled.sql + '\n-- ' + JSON.stringify(compiled.params),
  );
});

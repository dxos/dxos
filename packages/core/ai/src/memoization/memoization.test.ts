import { describe, it } from '@effect/vitest';
import { Effect } from 'effect';

describe('memoization', () => {
  it.effect(
    'context paths',
    Effect.fnUntraced(function* (ctx) {
      const filepath = ctx.task.file.filepath;
      console.log({ filepath });
    }),
  );
});

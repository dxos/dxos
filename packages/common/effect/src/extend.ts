import { Effect, Record } from 'effect';

/**
 * Extends an effect with additional properties.
 */
export const extendEffect = <A, E, R, const P extends Record.ReadonlyRecord<string, any>>(
  effect: Effect.Effect<A, E, R>,
  props: P,
): Effect.Effect<A, E, R> & P => {
  return Object.create(
    effect,
    Record.map(props, (value) => ({ value })),
  );
};

//
// Copyright 2022 DXOS.org
//

const instanceTag = Symbol('instanceTag');

/**
 * Makes instanceof work correctly even if the class definition was duplicated (e.g. when bundling).
 * The comparison is done by comparing the tag passed to this function.
 *
 * Example:
 *
 * ```typescript
 * @safeInstanceof('Tagged')
 * class Tagged {}
 * ```
 */
export const safeInstanceof =
  (tag: string): ClassDecorator =>
  (target: any) => {
    target.prototype[instanceTag] = tag;

    Object.defineProperty(target.prototype, Symbol.hasInstance, {
      value: (instance: any) => instance[instanceTag] === tag
    });
  };

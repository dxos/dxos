//
// Copyright 2022 DXOS.org
//

const Ref = Symbol('Ref');

interface Ref {
  [Ref]: true
  value: any
}

/**
 * Pass a JS value by reference rather then parsing it as code.
 *
 * Usage example:
 *
 * ```typescript
 * const double = x => x * 2;;
 * codegen('add', ['a', 'b'], c => {
 *   c`const c = a + b;`;
 *   c`return ${ref(double)}(c)`;
 * });
 * ```
 *
 * would generate a function:
 *
 * ```typescript
 * const double = x => x * 2;;
 * function add(a, b) {
 *   const c = a + b;
 *   return double(c);
 * }
 * ```
 */
export const ref = (value: any): Ref => ({
  [Ref]: true,
  value
});

const isRef = (value: any): value is Ref => value[Ref] === true;

/**
 * DSL for runtime code generation.
 *
 * Example:
 *
 * ```typescript
 * const multiplier = 5;
 * codegen('add', ['a', 'b'], c => {
 *   c`const c = a + b;`;
 *   c`return c * ${multiplier};`;
 * });
 * ```
 *
 * would generate a function:
 *
 * ```typescript
 * function add(a, b) {
 *   const c = a + b;
 *   return c * 5;
 * }
 * ```
 *
 * @param name Function name. Will appear in stack traces.
 * @param args Names of function arguments.
 * @param gen Closure that builds the function source.
 * @param ctx Optional record with context variables that will appear in function's scope.
 */
export const codegen = (name: string, args: string[], gen: (c: (parts: TemplateStringsArray, ...args: any[]) => void) => void, ctx: Record<string, any> = {}): (...args: any[]) => any => {
  const newCtx = { ...ctx };
  let nextAnnon = 1;

  let buf = '';
  gen((parts, ...args) => {
    const preprocessArg = (arg: any) => {
      if (isRef(arg)) {
        const name = `anon${nextAnnon++}`;
        newCtx[name] = arg.value;
        return name;
      } else {
        return arg;
      }
    };
    buf += parts.map((s, i) => s + (i < args.length ? preprocessArg(args[i]) : '')).join('') + '\n';
  });

  const code = `return function ${name}(${args.join(', ')}) {\n${buf}\n}`;

  // Create function from generated code.
  // eslint-disable-next-line no-new-func
  return Function(...Object.keys(newCtx), code)(...Object.values(newCtx));
};

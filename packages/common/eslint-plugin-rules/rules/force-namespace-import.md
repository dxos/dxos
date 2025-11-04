# force-namespace-import

Enforces namespace imports for modules marked with `// @import-as-namespace` comment.

## Rule Details

This rule ensures that modules marked with the `// @import-as-namespace` comment are:

1. Always imported using namespace import syntax: `import * as Mod from './Mod'`
2. Always exported using namespace export syntax: `export * as Mod from './Mod'`
3. Have UpperCamelCase file names
4. Use namespace aliases that match the file name

## Examples

### Marking a module for namespace imports

In your module file (`Schema.ts`):

```typescript
//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

export const foo = 'bar';
export type SchemaType = { name: string };
```

### ✅ Correct Usage

```typescript
// Correct namespace import.
import * as Schema from './Schema';

// Correct type-only namespace import.
import type * as Schema from './Schema';

// Correct namespace export.
export * as Schema from './Schema';

// Usage.
console.log(Schema.foo);
```

### ❌ Incorrect Usage

```typescript
// ❌ Named import - will be auto-fixed to namespace import.
import { foo } from './Schema';

// ❌ Default import - will be auto-fixed to namespace import.
import Schema from './Schema';

// ❌ Wrong namespace alias - will be auto-fixed to match file name.
import * as WrongName from './Schema';

// ❌ Export without namespace - will be auto-fixed.
export * from './Schema';

// ❌ Named export - will be auto-fixed to namespace export.
export { foo } from './Schema';

// ❌ Wrong namespace export name - will be auto-fixed.
export * as WrongName from './Schema';
```

## Options

This rule has no options.

## Usage

This rule is not enabled by default in the recommended configuration. To enable it, add it to your ESLint configuration:

```javascript
// eslint.config.mjs
export default [
  {
    plugins: {
      'dxos-plugin': dxosPlugin,
    },
    rules: {
      'dxos-plugin/force-namespace-import': 'error',
    },
  },
];
```

## Manual Testing

To test the rule, create a module with the `@import-as-namespace` comment and try importing it in different ways. The rule will report errors for incorrect import styles and provide auto-fixes.

Example test files are provided in the `examples/` directory:
- `examples/Schema.ts` - A module marked for namespace imports
- `examples/usage.ts` - Example usage showing correct patterns

## When Not To Use It

If you prefer more flexible import styles and don't need the namespace pattern, you can disable this rule.

## Further Reading

- [ES6 Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import)
- [TypeScript Namespaces](https://www.typescriptlang.org/docs/handbook/namespaces.html)

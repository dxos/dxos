# Force Namespace Import Rule - Quick Start Guide

## Overview

The `force-namespace-import` ESLint rule enforces namespace imports for modules marked with the `// @import-as-namespace` comment.

## Quick Setup

### 1. Enable the Rule

Add to your `eslint.config.mjs` in the rules section:

```javascript
{
  files: ['**/*.{js,ts,jsx,tsx}'],
  extends: [
    // ... other configs
    dxos.configs.recommended,
  ],
  rules: {
    // ... other rules
    'dxos-plugin/force-namespace-import': 'error',
  },
}
```

### 2. Mark Modules for Namespace Import

In any module you want to enforce namespace imports, add the comment at the top:

```typescript
//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

export const foo = 'bar';
export type MyType = { /* ... */ };
```

**Important:** The module filename MUST be in UpperCamelCase (e.g., `Schema.ts`, `MyModule.tsx`).

### 3. Import Correctly

```typescript
// ✅ Correct - namespace import with name matching filename.
import * as Schema from './Schema';
import type * as Schema from './Schema';

// ❌ Wrong - will be flagged and auto-fixed.
import { foo } from './Schema';
import Schema from './Schema';
import * as WrongName from './Schema';
```

### 4. Export Correctly

```typescript
// ✅ Correct - namespace export with name matching filename.
export * as Schema from './Schema';
export type * as Schema from './Schema';

// ❌ Wrong - will be flagged and auto-fixed.
export * from './Schema';
export { foo } from './Schema';
export * as WrongName from './Schema';
```

## What the Rule Checks

1. **Namespace Import/Export** - Modules with `@import-as-namespace` must use `import * as Name` syntax.
2. **Name Matching** - The namespace alias must match the filename (e.g., `Schema.ts` → `import * as Schema`).
3. **UpperCamelCase** - Marked modules must have UpperCamelCase filenames.
4. **Auto-fix** - Most violations can be automatically fixed with `eslint --fix`.

## Benefits

- **Consistent API Surface** - Forces modules to be consumed as cohesive units.
- **Clear Boundaries** - Makes it obvious which modules are meant to be used as namespaces.
- **Better Imports** - Avoids deep imports and encourages proper module design.
- **TypeScript Friendly** - Works well with TypeScript's namespace and module patterns.

## Common Use Cases

### Effect-TS Style Modules

```typescript
// Schema.ts
// @import-as-namespace

export const String = /* ... */;
export const Number = /* ... */;
export type Schema<A> = /* ... */;

// Usage:
import * as Schema from './Schema';
const mySchema = Schema.String.pipe(/* ... */);
```

### Utility Modules

```typescript
// DateUtils.ts
// @import-as-namespace

export const format = /* ... */;
export const parse = /* ... */;
export const add = /* ... */;

// Usage:
import * as DateUtils from './DateUtils';
DateUtils.format(new Date());
```

### API Modules

```typescript
// Api.ts
// @import-as-namespace

export const getUser = /* ... */;
export const updateUser = /* ... */;
export type User = /* ... */;

// Usage:
import * as Api from './Api';
const user = await Api.getUser('123');
```

## Testing

Example files are provided in `examples/`:
- `examples/Schema.ts` - A module marked with `@import-as-namespace`
- `examples/usage.ts` - Correct usage examples

Run ESLint on these files to see the rule in action:

```bash
cd packages/common/eslint-plugin-rules
npx eslint examples/
```

## Troubleshooting

### "Module must have UpperCamelCase name"

Rename your file to UpperCamelCase (e.g., `schema.ts` → `Schema.ts`).

### "Namespace alias must match file name"

Fix the import to use the correct name:
```typescript
// Wrong:
import * as Foo from './Schema';

// Correct:
import * as Schema from './Schema';
```

### Rule not running?

Make sure:
1. The rule is enabled in your ESLint config.
2. The target file has the `// @import-as-namespace` comment.
3. The import is a relative import (starts with `.` or `..`).

## Complete Example

See [./rules/force-namespace-import.md](./rules/force-namespace-import.md) for detailed documentation.

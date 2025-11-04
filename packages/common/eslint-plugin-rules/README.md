# @dxos/eslint-plugin-rules

Custom ESLint rules for the DXOS codebase.

## Installation

```bash
pnpm i @dxos/eslint-plugin-rules
```

## Usage

The plugin is automatically included in the DXOS workspace via the recommended configuration in `eslint.config.mjs`.

To enable additional rules not in the recommended config:

```javascript
// eslint.config.mjs
import dxos from '@dxos/eslint-plugin-rules';

export default [
  {
    extends: [dxos.configs.recommended],
    rules: {
      'dxos-plugin/force-namespace-import': 'error', // Enable additional rule.
    },
  },
];
```

## Available Rules

### Enabled by Default (in recommended config)

- **`effect-subpath-imports`** - Enforces subpath imports for Effect packages.
- **`header`** - Enforces copyright header in all files.
- **`no-empty-promise-catch`** - Enforces passing an error handler to promise `.catch()`.

### Available but Not Enabled

- **`comment`** - Enforces proper comment formatting (TODO format, capitalization, punctuation).
- **`force-namespace-import`** - Enforces namespace imports for modules marked with `// @import-as-namespace`.

## Rule Documentation

For detailed documentation on each rule:

- [force-namespace-import](./rules/force-namespace-import.md) - NEW: Enforces namespace imports for marked modules

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- Talk to us on [Discord](https://dxos.org/discord)

## Contributions

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](https://github.com/dxos/dxos/blob/main/CODE_OF_CONDUCT.md), the [issue guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-issues), and the [PR contribution guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-prs).

License: [MIT](./LICENSE) Copyright 2022 © DXOS

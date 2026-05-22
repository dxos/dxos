# @dxos/deus

> Pattern specification language for human-agent collaborative software development.

A `.mdl` file is the authoritative description of a system — its types,
behaviour, interfaces, and acceptance criteria — from which implementation,
tests, and documentation can be derived.

This package carries:

- **The language spec** — see [`docs/DESIGN.md`](./docs/DESIGN.md).
- **The idiom format** — [`docs/IDIOMS.md`](./docs/IDIOMS.md).
- **The core dialect** — [`lang/core.mdl`](./lang/core.mdl).
- **A document template** — [`lang/PLUGIN-.template.mdl`](./lang/PLUGIN-.template.mdl).
- **Examples** — the chess trilogy under [`lang/examples/`](./lang/examples/).
- **The CodeMirror extension** — `.mdl` grammar, syntax, lint, completion under [`src/extension/`](./src/extension/).

Consumers (e.g. `@dxos/plugin-code`) import the extension barrel:

```ts
import { mdl, mdlBlockDescription, mdlLint, mdlComplete } from '@dxos/deus/extension';
```

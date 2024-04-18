# @dxos/echo-schema

ECHO database.

## Installation

```bash
pnpm i @dxos/echo-schema
```

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- Talk to us on [Discord](https://discord.gg/eXVfryv3sW)

# ECHO Schema

- ECHO Schema is a lightweight runtime type system to define objects independently of their storage (e.g., native file system, browser storage, ECHO)
- All objects are associated with a schema definition.
- Schemas are defined by EffectTS.
- Schemas may be statically defined by code, or be runtime mutable.
- Each space maintains a schema registry.
- Schema definitions are versioned with semvar semantics.
  - Objects created with a schema version lower than the current major/minor version must be migrated.
  - Non-migrated objects are not visible to queries unless explicitly requested.
- Schema definitions are serializable via JSON schema.
- Properties may include strong and weak references to other objects.
  - Strong references define an owning relationship indicating that referenced objects should be deleted (or migrated) when the parent object is deleted.
- Objects include the following metadata:
  - Schema name (immutable)
  - Schema version: updated during schema migration
  - Version
  - Creation time (immutable)
  - Last mutation time

## Contributions

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](https://github.com/dxos/dxos/blob/main/CODE_OF_CONDUCT.md), the [issue guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-issues), and the [PR contribution guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-prs).

License: [MIT](./LICENSE) Copyright 2022 © DXOS

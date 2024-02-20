# ECHO Schema

- ECHO Schema is a lightweight runtime type system to define objects independently of their storage (e.g., native file system, browser storage, ECHO)
- All objects are associated with a schema definition.
- Schemas are defined by EffectTS.
- Schemas may be statically defined by code, or be runtime mutable.
- Each space maintains a schema registry.
- Schema definitions are versioned with semvar semantics.
  - Objects created with a schema version lower than the current major/minor version must be migrated.
  - Non-migrated objects are not visible to queries unless explicitly requested.
- Schema definitions are serializable.
  - ISSUE: Via JSON schema?
- Properties may include strong and weak references to other objects.
  - Strong references define an owning relationship indicating that referenced objects should be deleted (or migrated) when the parent object is deleted.
- Objects include the following metadata:
  - Schema name (immutable)
  - Schema version: updated during schema migration
  - Version
  - Creation time (immutable)
  - Last mutation time

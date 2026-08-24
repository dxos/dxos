---
'@dxos/config': minor
'@dxos/protocols': minor
---

`@dxos/config` is converted to buf (`@bufbuild/protobuf`) and no longer depends on protobuf.js.

**Breaking** (riding the minor, per the pre-1.0 policy): `defs` and `ConfigProto` now come from the buf-generated module, which renders nested
types flat — `Runtime.Client.ServicesMode` is `Runtime_Client_ServicesMode`, and so on for every
nested message and enum. Config _inputs_ (loaders, savers, the `Config` constructor) take the new
`ConfigInit` type; `Config.values` is a buf message, so it carries `$typeName` and compares against
`toJson(ConfigSchema, …)` rather than a plain object.

`runtime.app.env` is a `google.protobuf.Struct`, so its values are typed `JsonValue` rather than
`any`. `getEnvString(config, key)` reads a string out of it, returning `undefined` for any other
JSON value.

`validateConfig` normalises through `create(ConfigSchema, …)` instead of running the protobuf.js
`verify` pass; field types are checked by the compiler through `ConfigInit`. Loaders that read
untrusted YAML should validate as they parse.

`@dxos/protocols` gains `bufMessage()` alongside `protoMessage()`: an Effect codec for a buf message
type with the same wire format, used by `SystemService.getConfig`.

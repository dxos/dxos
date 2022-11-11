# codec-protobuf

There's an associated @dxos/protobuf-compiler package that does codegen based on protobuf schema.

## Handling of scalar fields with default values

Based on:
- https://github.com/protocolbuffers/protobuf/blob/main/docs/field_presence.md
- https://github.com/protocolbuffers/protobuf/blob/main/docs/implementing_proto3_presence.md


In protobuf scalar fields (numbers, booleans, strings, bytes, enums) may have an implicit default value:

- 0 for number types
- false for booleans
- '' (empty string) for strings
- [] for bytes
- First enum value for enums

### Non-optional fields

Example:

```protobuf
int32 number = 1;
```

If the field is set to it's default value (0 in this example) it MAY be missing in the wire encoding (Go implementation) or present with the value set to 0 (JS implementation).

When decoding, the missing fields MUST be treated as having the default implicit value (0 in this case).

### Optional fields

```protobuf
optional int32 number = 1;
```

If the field is set to it's default value (0 in this example) it MUST be present in the wire encoding with the value set to 0.

When decoding, the missing fields it MUST be set as undefined. If the field is present in the wire format, it must be set to its numeric value.

## Toolchain

This package must NOT use `toolchain` to avoid cyclic dependencies.

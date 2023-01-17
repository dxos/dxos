---
title: Enumerations
---
# Enumerations
### [`Error`]()

Defined in:
   file://./../../../dxos/client/services.proto

Values:
- `INVALID_CREDENTIALS`
- `INVALID_OPT_ATTEMPTS`
- `INVALID_OTP`
- `OK`
- `TIMEOUT`
### [`State`]()

Defined in:
   file://./../../../dxos/client/services.proto

Values:
- `AUTHENTICATING`
- `CANCELLED`
- `CONNECTED`
- `CONNECTING`
- `ERROR`
- `INIT`
- `SUCCESS`
- `TIMEOUT`
### [`Type`]()

Defined in:
   file://./../../../dxos/client/services.proto

Values:
- `INTERACTIVE`
- `INTERACTIVE_TESTING`
- `MULTIUSE_TESTING`
- `OFFLINE`
### [`PresenceState`]()

Defined in:
   file://./../../dxos/client.proto

Values:
- `OFFLINE`
- `ONLINE`
### [`ItemFilterDeleted`]()

Controls how deleted items are filtered.

Values:
- `HIDE_DELETED` Do not return deleted items. Default behaviour.
- `SHOW_DELETED` Return deleted and regular items.
- `SHOW_DELETED_ONLY` Return only deleted items.
### [`KeyType`]()

Defined in:
   file://./../../../dxos/halo/keys.proto

Values:
- `DEVICE`
- `DXNS_ADDRESS`
- `FEED`
- `IDENTITY`
- `SPACE`
- `UNKNOWN`
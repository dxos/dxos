# Interface: EchoParams

[@dxos/echo-db](../modules/dxos_echo_db.md).EchoParams

Various options passed to `ECHO.create`.

## Table of contents

### Properties

- [keyStorage](dxos_echo_db.EchoParams.md#keystorage)
- [networkManagerOptions](dxos_echo_db.EchoParams.md#networkmanageroptions)
- [readLogger](dxos_echo_db.EchoParams.md#readlogger)
- [snapshotInterval](dxos_echo_db.EchoParams.md#snapshotinterval)
- [snapshots](dxos_echo_db.EchoParams.md#snapshots)
- [storage](dxos_echo_db.EchoParams.md#storage)
- [writeLogger](dxos_echo_db.EchoParams.md#writelogger)

## Properties

### keyStorage

• `Optional` **keyStorage**: `any`

Storage used for keys. Defaults to in-memory.

#### Defined in

[packages/echo/echo-db/src/echo.ts:56](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L56)

___

### networkManagerOptions

• `Optional` **networkManagerOptions**: `NetworkManagerOptions`

Networking provider. Defaults to in-memory networking.

#### Defined in

[packages/echo/echo-db/src/echo.ts:62](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L62)

___

### readLogger

• `Optional` **readLogger**: (`msg`: `any`) => `void`

#### Type declaration

▸ (`msg`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | `any` |

##### Returns

`void`

#### Defined in

[packages/echo/echo-db/src/echo.ts:76](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L76)

___

### snapshotInterval

• `Optional` **snapshotInterval**: `number`

Number of messages after which snapshot will be created. Defaults to 100.

#### Defined in

[packages/echo/echo-db/src/echo.ts:73](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L73)

___

### snapshots

• `Optional` **snapshots**: `boolean`

Whether to save and load snapshots. Defaults to `true`.

#### Defined in

[packages/echo/echo-db/src/echo.ts:68](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L68)

___

### storage

• `Optional` **storage**: `Storage`

Storage to persist data. Defaults to in-memory.

#### Defined in

[packages/echo/echo-db/src/echo.ts:51](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L51)

___

### writeLogger

• `Optional` **writeLogger**: (`msg`: `any`) => `void`

#### Type declaration

▸ (`msg`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `msg` | `any` |

##### Returns

`void`

#### Defined in

[packages/echo/echo-db/src/echo.ts:77](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L77)

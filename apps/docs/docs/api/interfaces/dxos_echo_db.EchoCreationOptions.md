---
id: "dxos_echo_db.EchoCreationOptions"
title: "Interface: EchoCreationOptions"
sidebar_label: "EchoCreationOptions"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).EchoCreationOptions

Various options passed to `ECHO.create`.

## Properties

### keyStorage

• `Optional` **keyStorage**: `any`

Storage used for keys. Defaults to in-memory.

#### Defined in

[packages/echo/echo-db/src/echo.ts:50](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L50)

___

### networkManagerOptions

• `Optional` **networkManagerOptions**: `NetworkManagerOptions`

Networking provider. Defaults to in-memory networking.

#### Defined in

[packages/echo/echo-db/src/echo.ts:55](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L55)

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

[packages/echo/echo-db/src/echo.ts:69](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L69)

___

### snapshotInterval

• `Optional` **snapshotInterval**: `number`

Number of messages after which snapshot will be created. Defaults to 100.

#### Defined in

[packages/echo/echo-db/src/echo.ts:66](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L66)

___

### snapshots

• `Optional` **snapshots**: `boolean`

Whether to save and load snapshots. Defaults to `true`.

#### Defined in

[packages/echo/echo-db/src/echo.ts:61](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L61)

___

### storage

• `Optional` **storage**: `Storage`

Storage to persist data. Defaults to in-memory.

#### Defined in

[packages/echo/echo-db/src/echo.ts:45](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L45)

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

[packages/echo/echo-db/src/echo.ts:70](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L70)

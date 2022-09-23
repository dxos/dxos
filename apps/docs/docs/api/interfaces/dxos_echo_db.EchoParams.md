---
id: "dxos_echo_db.EchoParams"
title: "Interface: EchoParams"
sidebar_label: "EchoParams"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).EchoParams

Various options passed to `ECHO.create`.

## Properties

### keyStorage

• `Optional` **keyStorage**: `any`

Storage used for keys. Defaults to in-memory.

#### Defined in

[packages/echo/echo-db/src/echo.ts:56](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/echo.ts#L56)

___

### networkManagerOptions

• `Optional` **networkManagerOptions**: `NetworkManagerOptions`

Networking provider. Defaults to in-memory networking.

#### Defined in

[packages/echo/echo-db/src/echo.ts:62](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/echo.ts#L62)

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

[packages/echo/echo-db/src/echo.ts:76](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/echo.ts#L76)

___

### snapshotInterval

• `Optional` **snapshotInterval**: `number`

Number of messages after which snapshot will be created. Defaults to 100.

#### Defined in

[packages/echo/echo-db/src/echo.ts:73](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/echo.ts#L73)

___

### snapshots

• `Optional` **snapshots**: `boolean`

Whether to save and load snapshots. Defaults to `true`.

#### Defined in

[packages/echo/echo-db/src/echo.ts:68](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/echo.ts#L68)

___

### storage

• `Optional` **storage**: `Storage`

Storage to persist data. Defaults to in-memory.

#### Defined in

[packages/echo/echo-db/src/echo.ts:51](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/echo.ts#L51)

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

[packages/echo/echo-db/src/echo.ts:77](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/echo.ts#L77)

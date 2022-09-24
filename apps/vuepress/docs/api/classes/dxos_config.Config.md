# Class: Config

[@dxos/config](../modules/dxos_config.md).Config

Global configuration object.
NOTE: Config objects are immutable.

## Table of contents

### Constructors

- [constructor](dxos_config.Config.md#constructor)

### Properties

- [\_config](dxos_config.Config.md#_config)

### Accessors

- [values](dxos_config.Config.md#values)

### Methods

- [get](dxos_config.Config.md#get)
- [getOrThrow](dxos_config.Config.md#getorthrow)
- [getUnchecked](dxos_config.Config.md#getunchecked)

## Constructors

### constructor

• **new Config**(...`objects`)

Creates an immutable instance.

#### Parameters

| Name | Type |
| :------ | :------ |
| `...objects` | [[`Config`](../interfaces/dxos_config.defs.Config.md), ...Config[]] |

#### Defined in

[packages/sdk/config/src/config.ts:100](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/config/src/config.ts#L100)

## Properties

### \_config

• `Private` `Readonly` **\_config**: `any`

#### Defined in

[packages/sdk/config/src/config.ts:93](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/config/src/config.ts#L93)

## Accessors

### values

• `get` **values**(): [`Config`](../interfaces/dxos_config.defs.Config.md)

Returns an immutable config JSON object.

#### Returns

[`Config`](../interfaces/dxos_config.defs.Config.md)

#### Defined in

[packages/sdk/config/src/config.ts:107](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/config/src/config.ts#L107)

## Methods

### get

▸ **get**<`K`\>(`key`, `defaultValue?`): [`DeepIndex`](../modules/dxos_config.md#deepindex)<[`Config`](../interfaces/dxos_config.defs.Config.md), [`ParseKey`](../modules/dxos_config.md#parsekey)<`K`\>, `undefined`\>

Returns the given config property.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `K` | extends ``"version"`` \| ``"package"`` \| ``"runtime"`` \| ``"package.repos"`` \| ``"package.repos.length"`` \| \`package.repos.${number}.version\` \| \`package.repos.${number}.name\` \| \`package.repos.${number}.url\` \| ``"package.license"`` \| ``"package.modules"`` \| ``"package.modules.length"`` \| \`package.modules.${number}.name\` \| \`package.modules.${number}.repos\` \| \`package.modules.${number}.repos.length\` \| \`package.modules.${number}.repos.${number}.version\` \| \`package.modules.${number}.repos.${number}.name\` \| \`package.modules.${number}.repos.${number}.url\` \| \`package.modules.${number}.type\` \| \`package.modules.${number}.displayName\` \| \`package.modules.${number}.description\` \| \`package.modules.${number}.tags\` \| \`package.modules.${number}.bundle\` \| \`package.modules.${number}.build\` \| \`package.modules.${number}.record\` \| \`package.modules.${number}.tags.length\` \| \`package.modules.${number}.tags.${number}\` \| \`package.modules.${number}.bundle.length\` \| \`package.modules.${number}.bundle.${number}\` \| \`package.modules.${number}.bundle.byteLength\` \| \`package.modules.${number}.bundle.BYTES\_PER\_ELEMENT\` \| \`package.modules.${number}.bundle.byteOffset\` \| \`package.modules.${number}.bundle.buffer.byteLength\` \| \`package.modules.${number}.build.version\` \| \`package.modules.${number}.build.command\` \| \`package.modules.${number}.build.outdir\` \| \`package.modules.${number}.build.tag\` \| ``"runtime.app"`` \| ``"runtime.services"`` \| ``"runtime.kube"`` \| ``"runtime.client"`` \| ``"runtime.cli"`` \| ``"runtime.props"`` \| ``"runtime.system"`` \| ``"runtime.client.debug"`` \| ``"runtime.client.storage"`` \| ``"runtime.client.enableSnapshots"`` \| ``"runtime.client.snapshotInterval"`` \| ``"runtime.client.invitationExpiration"`` \| ``"runtime.client.mode"`` \| ``"runtime.client.remoteSource"`` \| ``"runtime.client.storage.persistent"`` \| ``"runtime.client.storage.keyStorage"`` \| ``"runtime.client.storage.storageType"`` \| ``"runtime.client.storage.path"`` \| ``"runtime.app.org"`` \| ``"runtime.app.theme"`` \| ``"runtime.app.website"`` \| ``"runtime.app.publicUrl"`` \| ``"runtime.cli.channel"`` \| ``"runtime.cli.app"`` \| ``"runtime.cli.nodePath"`` \| ``"runtime.cli.console"`` \| ``"runtime.cli.mdns"`` \| ``"runtime.cli.signal"`` \| ``"runtime.cli.npmClient"`` \| ``"runtime.cli.app.serve"`` \| ``"runtime.cli.app.serve.config"`` \| ``"runtime.cli.app.serve.loginApp"`` \| ``"runtime.cli.app.serve.keyPhrase"`` \| ``"runtime.cli.console.config"`` \| ``"runtime.cli.console.package"`` \| ``"runtime.cli.console.channel"`` \| ``"runtime.cli.console.bin"`` \| ``"runtime.cli.mdns.config"`` \| ``"runtime.cli.mdns.package"`` \| ``"runtime.cli.mdns.channel"`` \| ``"runtime.cli.mdns.bin"`` \| ``"runtime.cli.signal.config"`` \| ``"runtime.cli.signal.package"`` \| ``"runtime.cli.signal.channel"`` \| ``"runtime.cli.signal.bin"`` \| ``"runtime.props.title"`` \| ``"runtime.services.app"`` \| ``"runtime.services.signal"`` \| ``"runtime.services.kube"`` \| ``"runtime.services.dxns"`` \| ``"runtime.services.ipfs"`` \| ``"runtime.services.ice"`` \| ``"runtime.services.machine"`` \| ``"runtime.services.bot"`` \| ``"runtime.services.publisher"`` \| ``"runtime.services.app.prefix"`` \| ``"runtime.services.app.server"`` \| ``"runtime.services.kube.publicUrl"`` \| ``"runtime.services.kube.endpoints"`` \| ``"runtime.services.kube.endpoints.services"`` \| ``"runtime.services.kube.endpoints.logs"`` \| ``"runtime.services.kube.endpoints.cert"`` \| ``"runtime.services.signal.server"`` \| ``"runtime.services.signal.api"`` \| ``"runtime.services.signal.status"`` \| ``"runtime.services.dxns.server"`` \| ``"runtime.services.dxns.accountUri"`` \| ``"runtime.services.dxns.address"`` \| ``"runtime.services.dxns.account"`` \| ``"runtime.services.dxns.faucet"`` \| ``"runtime.services.ipfs.server"`` \| ``"runtime.services.ipfs.gateway"`` \| ``"runtime.services.ice.length"`` \| \`runtime.services.ice.${number}.urls\` \| \`runtime.services.ice.${number}.username\` \| \`runtime.services.ice.${number}.credential\` \| ``"runtime.services.machine.doAccessToken"`` \| ``"runtime.services.machine.githubAccessToken"`` \| ``"runtime.services.machine.githubUsername"`` \| ``"runtime.services.machine.dnsDomain"`` \| ``"runtime.services.machine.npmAccessToken"`` \| ``"runtime.services.bot.persistent"`` \| ``"runtime.services.bot.topic"`` \| ``"runtime.services.bot.retryAttempts"`` \| ``"runtime.services.bot.retryInterval"`` \| ``"runtime.services.publisher.server"`` \| ``"runtime.system.debug"`` \| ``"runtime.kube.port"`` \| ``"runtime.kube.host"`` \| ``"runtime.kube.autoupdate"`` \| ``"runtime.kube.https"`` \| ``"runtime.kube.p2p"`` \| ``"runtime.kube.confhost"`` \| ``"runtime.kube.autoupdate.enabled"`` \| ``"runtime.kube.autoupdate.interval"`` \| ``"runtime.kube.https.enabled"`` \| ``"runtime.kube.https.port"`` \| ``"runtime.kube.https.email"`` \| ``"runtime.kube.https.certfile"`` \| ``"runtime.kube.https.keyfile"`` \| ``"runtime.kube.p2p.port"`` \| ``"runtime.kube.p2p.privatekey"`` \| ``"runtime.kube.p2p.bootstrap"`` \| ``"runtime.kube.p2p.bootstrap.length"`` \| \`runtime.kube.p2p.bootstrap.${number}\` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `key` | `K` | A key in the config object. Can be a nested property with keys separated by dots: 'services.signal.server'. |
| `defaultValue?` | [`DeepIndex`](../modules/dxos_config.md#deepindex)<[`Config`](../interfaces/dxos_config.defs.Config.md), [`ParseKey`](../modules/dxos_config.md#parsekey)<`K`\>, `undefined`\> | Default value to return if option is not present in the config. |

#### Returns

[`DeepIndex`](../modules/dxos_config.md#deepindex)<[`Config`](../interfaces/dxos_config.defs.Config.md), [`ParseKey`](../modules/dxos_config.md#parsekey)<`K`\>, `undefined`\>

The config value or undefined if the option is not present.

#### Defined in

[packages/sdk/config/src/config.ts:118](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/config/src/config.ts#L118)

___

### getOrThrow

▸ **getOrThrow**<`K`\>(`key`): `Exclude`<[`DeepIndex`](../modules/dxos_config.md#deepindex)<[`Config`](../interfaces/dxos_config.defs.Config.md), [`ParseKey`](../modules/dxos_config.md#parsekey)<`K`\>, `undefined`\>, `undefined`\>

Returns the given config property or throw if it doesn't exist.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `K` | extends ``"version"`` \| ``"package"`` \| ``"runtime"`` \| ``"package.repos"`` \| ``"package.repos.length"`` \| \`package.repos.${number}.version\` \| \`package.repos.${number}.name\` \| \`package.repos.${number}.url\` \| ``"package.license"`` \| ``"package.modules"`` \| ``"package.modules.length"`` \| \`package.modules.${number}.name\` \| \`package.modules.${number}.repos\` \| \`package.modules.${number}.repos.length\` \| \`package.modules.${number}.repos.${number}.version\` \| \`package.modules.${number}.repos.${number}.name\` \| \`package.modules.${number}.repos.${number}.url\` \| \`package.modules.${number}.type\` \| \`package.modules.${number}.displayName\` \| \`package.modules.${number}.description\` \| \`package.modules.${number}.tags\` \| \`package.modules.${number}.bundle\` \| \`package.modules.${number}.build\` \| \`package.modules.${number}.record\` \| \`package.modules.${number}.tags.length\` \| \`package.modules.${number}.tags.${number}\` \| \`package.modules.${number}.bundle.length\` \| \`package.modules.${number}.bundle.${number}\` \| \`package.modules.${number}.bundle.byteLength\` \| \`package.modules.${number}.bundle.BYTES\_PER\_ELEMENT\` \| \`package.modules.${number}.bundle.byteOffset\` \| \`package.modules.${number}.bundle.buffer.byteLength\` \| \`package.modules.${number}.build.version\` \| \`package.modules.${number}.build.command\` \| \`package.modules.${number}.build.outdir\` \| \`package.modules.${number}.build.tag\` \| ``"runtime.app"`` \| ``"runtime.services"`` \| ``"runtime.kube"`` \| ``"runtime.client"`` \| ``"runtime.cli"`` \| ``"runtime.props"`` \| ``"runtime.system"`` \| ``"runtime.client.debug"`` \| ``"runtime.client.storage"`` \| ``"runtime.client.enableSnapshots"`` \| ``"runtime.client.snapshotInterval"`` \| ``"runtime.client.invitationExpiration"`` \| ``"runtime.client.mode"`` \| ``"runtime.client.remoteSource"`` \| ``"runtime.client.storage.persistent"`` \| ``"runtime.client.storage.keyStorage"`` \| ``"runtime.client.storage.storageType"`` \| ``"runtime.client.storage.path"`` \| ``"runtime.app.org"`` \| ``"runtime.app.theme"`` \| ``"runtime.app.website"`` \| ``"runtime.app.publicUrl"`` \| ``"runtime.cli.channel"`` \| ``"runtime.cli.app"`` \| ``"runtime.cli.nodePath"`` \| ``"runtime.cli.console"`` \| ``"runtime.cli.mdns"`` \| ``"runtime.cli.signal"`` \| ``"runtime.cli.npmClient"`` \| ``"runtime.cli.app.serve"`` \| ``"runtime.cli.app.serve.config"`` \| ``"runtime.cli.app.serve.loginApp"`` \| ``"runtime.cli.app.serve.keyPhrase"`` \| ``"runtime.cli.console.config"`` \| ``"runtime.cli.console.package"`` \| ``"runtime.cli.console.channel"`` \| ``"runtime.cli.console.bin"`` \| ``"runtime.cli.mdns.config"`` \| ``"runtime.cli.mdns.package"`` \| ``"runtime.cli.mdns.channel"`` \| ``"runtime.cli.mdns.bin"`` \| ``"runtime.cli.signal.config"`` \| ``"runtime.cli.signal.package"`` \| ``"runtime.cli.signal.channel"`` \| ``"runtime.cli.signal.bin"`` \| ``"runtime.props.title"`` \| ``"runtime.services.app"`` \| ``"runtime.services.signal"`` \| ``"runtime.services.kube"`` \| ``"runtime.services.dxns"`` \| ``"runtime.services.ipfs"`` \| ``"runtime.services.ice"`` \| ``"runtime.services.machine"`` \| ``"runtime.services.bot"`` \| ``"runtime.services.publisher"`` \| ``"runtime.services.app.prefix"`` \| ``"runtime.services.app.server"`` \| ``"runtime.services.kube.publicUrl"`` \| ``"runtime.services.kube.endpoints"`` \| ``"runtime.services.kube.endpoints.services"`` \| ``"runtime.services.kube.endpoints.logs"`` \| ``"runtime.services.kube.endpoints.cert"`` \| ``"runtime.services.signal.server"`` \| ``"runtime.services.signal.api"`` \| ``"runtime.services.signal.status"`` \| ``"runtime.services.dxns.server"`` \| ``"runtime.services.dxns.accountUri"`` \| ``"runtime.services.dxns.address"`` \| ``"runtime.services.dxns.account"`` \| ``"runtime.services.dxns.faucet"`` \| ``"runtime.services.ipfs.server"`` \| ``"runtime.services.ipfs.gateway"`` \| ``"runtime.services.ice.length"`` \| \`runtime.services.ice.${number}.urls\` \| \`runtime.services.ice.${number}.username\` \| \`runtime.services.ice.${number}.credential\` \| ``"runtime.services.machine.doAccessToken"`` \| ``"runtime.services.machine.githubAccessToken"`` \| ``"runtime.services.machine.githubUsername"`` \| ``"runtime.services.machine.dnsDomain"`` \| ``"runtime.services.machine.npmAccessToken"`` \| ``"runtime.services.bot.persistent"`` \| ``"runtime.services.bot.topic"`` \| ``"runtime.services.bot.retryAttempts"`` \| ``"runtime.services.bot.retryInterval"`` \| ``"runtime.services.publisher.server"`` \| ``"runtime.system.debug"`` \| ``"runtime.kube.port"`` \| ``"runtime.kube.host"`` \| ``"runtime.kube.autoupdate"`` \| ``"runtime.kube.https"`` \| ``"runtime.kube.p2p"`` \| ``"runtime.kube.confhost"`` \| ``"runtime.kube.autoupdate.enabled"`` \| ``"runtime.kube.autoupdate.interval"`` \| ``"runtime.kube.https.enabled"`` \| ``"runtime.kube.https.port"`` \| ``"runtime.kube.https.email"`` \| ``"runtime.kube.https.certfile"`` \| ``"runtime.kube.https.keyfile"`` \| ``"runtime.kube.p2p.port"`` \| ``"runtime.kube.p2p.privatekey"`` \| ``"runtime.kube.p2p.bootstrap"`` \| ``"runtime.kube.p2p.bootstrap.length"`` \| \`runtime.kube.p2p.bootstrap.${number}\` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `key` | `K` | A key in the config object. Can be a nested property with keys separated by dots: 'services.signal.server'. |

#### Returns

`Exclude`<[`DeepIndex`](../modules/dxos_config.md#deepindex)<[`Config`](../interfaces/dxos_config.defs.Config.md), [`ParseKey`](../modules/dxos_config.md#parsekey)<`K`\>, `undefined`\>, `undefined`\>

#### Defined in

[packages/sdk/config/src/config.ts:136](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/config/src/config.ts#L136)

___

### getUnchecked

▸ **getUnchecked**<`T`\>(`key`, `defaultValue?`): `T`

Returns config key without type checking.

**`Deprecated`**

Use the type-checked version.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `defaultValue?` | `T` |

#### Returns

`T`

#### Defined in

[packages/sdk/config/src/config.ts:127](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/config/src/config.ts#L127)

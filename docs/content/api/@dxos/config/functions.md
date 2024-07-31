---
title: Functions
---
# Functions
### [Defaults(basePath)](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/config/src/loaders/index.ts#L61)


JSON config.

Returns: <code>Partial&lt;[Config](/api/@dxos/config/interfaces/Config)&gt;</code>

Arguments: 

`basePath`: <code>string</code>


### [Dynamics()](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/config/src/loaders/index.ts#L48)


Provided dynamically by server.

Returns: <code>Partial&lt;[Config](/api/@dxos/config/interfaces/Config)&gt;</code>

Arguments: none




### [Envs(basePath)](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/config/src/loaders/index.ts#L53)


ENV variable (key/value) map.

Returns: <code>Partial&lt;[Config](/api/@dxos/config/interfaces/Config)&gt;</code>

Arguments: 

`basePath`: <code>string</code>


### [Local()](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/config/src/loaders/index.ts#L43)


Development config.

Returns: <code>Partial&lt;[Config](/api/@dxos/config/interfaces/Config)&gt;</code>

Arguments: none




### [Profile(profile)](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/config/src/loaders/index.ts#L34)


Profile

Returns: <code>[Config](/api/@dxos/config/interfaces/Config)</code>

Arguments: 

`profile`: <code>string</code>


### [Remote(target, \[authenticationToken\])](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/config/src/loaders/index.ts#L69)




Returns: <code>Partial&lt;[Config](/api/@dxos/config/interfaces/Config)&gt;</code>

Arguments: 

`target`: <code>undefined | string</code>

`authenticationToken`: <code>string</code>


### [SaveConfig(_)](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/config/src/savers/index.ts#L7)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`_`: <code>[Config](/api/@dxos/config/interfaces/Config)</code>


### [Storage()](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/config/src/loaders/index.ts#L67)


Load config from storage.

Returns: <code>Promise&lt;Partial&lt;[Config](/api/@dxos/config/interfaces/Config)&gt;&gt;</code>

Arguments: none




### [definitions(options)](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/config/src/plugin/definitions.ts#L19)




Returns: <code>object</code>

Arguments: 

`options`: <code>[ConfigPluginOpts](/api/@dxos/config/interfaces/ConfigPluginOpts)</code>


### [mapFromKeyValues(spec, values)](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/config/src/config.ts#L34)


Maps the given objects onto a flattened set of (key x values).

Expects parsed yaml content of the form:

 ```
ENV_VAR:
  path: config.selector.path
```

Returns: <code>object</code>

Arguments: 

`spec`: <code>MappingSpec</code>

`values`: <code>Record&lt;string, any&gt;</code>


### [mapToKeyValues(spec, values)](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/config/src/config.ts#L80)


Maps the given flattend set of (key x values) onto a JSON object.

Returns: <code>Record&lt;string, any&gt;</code>

Arguments: 

`spec`: <code>MappingSpec</code>

`values`: <code>any</code>


### [validateConfig(config)](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/config/src/config.ts#L102)


Validate config object.

Returns: <code>[Config](/api/@dxos/config/interfaces/Config)</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/config/interfaces/Config)</code>



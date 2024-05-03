# Type `Intent`
<sub>Declared in [packages/sdk/app-framework/src/plugins/IntentPlugin/intent.ts:20](https://github.com/dxos/dxos/blob/27607ac6b/packages/sdk/app-framework/src/plugins/IntentPlugin/intent.ts#L20)</sub>


An intent is an abstract description of an operation to be performed.
Intents allow actions to be performed across plugins.

## Properties
### [action](https://github.com/dxos/dxos/blob/27607ac6b/packages/sdk/app-framework/src/plugins/IntentPlugin/intent.ts#L31)
Type: <code>string</code>

The action to perform.


### [data](https://github.com/dxos/dxos/blob/27607ac6b/packages/sdk/app-framework/src/plugins/IntentPlugin/intent.ts#L42)
Type: <code>[IntentData](/api/@dxos/app-framework/types/IntentData)</code>

Any data needed to perform the desired action.


### [plugin](https://github.com/dxos/dxos/blob/27607ac6b/packages/sdk/app-framework/src/plugins/IntentPlugin/intent.ts#L26)
Type: <code>string</code>

Plugin ID.
If specified, the intent will be sent explicitly to the plugin.
Otherwise, the intent will be sent to all plugins, in order and the first to resolve a non-null value will be used.


### [undo](https://github.com/dxos/dxos/blob/27607ac6b/packages/sdk/app-framework/src/plugins/IntentPlugin/intent.ts#L36)
Type: <code>boolean</code>

Whether or not the intent is being undone.




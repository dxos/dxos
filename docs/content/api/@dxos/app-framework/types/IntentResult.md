# Type `IntentResult`
<sub>Declared in [packages/sdk/app-framework/src/plugins/IntentPlugin/intent.ts:44](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/app-framework/src/plugins/IntentPlugin/intent.ts#L44)</sub>




## Properties
### [data](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/app-framework/src/plugins/IntentPlugin/intent.ts#L50)
Type: <code>any</code>

The output of the action that was performed.

If the intent is apart of a chain of intents, the data will be passed to the next intent.


### [error](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/app-framework/src/plugins/IntentPlugin/intent.ts#L72)
Type: <code>Error</code>

An error that occurred while performing the action.

If the intent is apart of a chain of intents and an error occurs, the chain will be aborted.


### [intents](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/app-framework/src/plugins/IntentPlugin/intent.ts#L77)
Type: <code>[Intent](/api/@dxos/app-framework/types/Intent)[][]</code>

Other intent chains to be triggered.


### [undoable](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/app-framework/src/plugins/IntentPlugin/intent.ts#L55)
Type: <code>object</code>

If provided, the action will be undoable.




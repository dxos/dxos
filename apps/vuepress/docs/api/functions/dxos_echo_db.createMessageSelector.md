# Function: createMessageSelector

[@dxos/echo-db](../modules/dxos_echo_db.md).createMessageSelector

**createMessageSelector**(`timeframeClock`): `MessageSelector`

The MessageSelector makes sure that we read in a trusted order.
The first message we wish to process is the PartyGenesis, which will admit a Feed.
As we encounter and process FeedAdmit messages those are added to the Party's trust,
and we begin processing messages from them as well.

#### Parameters

| Name | Type |
| :------ | :------ |
| `timeframeClock` | [`TimeframeClock`](../classes/dxos_echo_db.TimeframeClock.md) |

#### Returns

`MessageSelector`

#### Defined in

[packages/echo/echo-db/src/pipeline/message-selector.ts:23](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/pipeline/message-selector.ts#L23)

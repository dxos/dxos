# Class `Shell`
<sub>Declared in [packages/sdk/client/src/services/shell.ts:46](https://github.com/dxos/dxos/blob/4d6eae504/packages/sdk/client/src/services/shell.ts#L46)</sub>


Interface for controlling the shell.

## Constructors
### [constructor(options)](https://github.com/dxos/dxos/blob/4d6eae504/packages/sdk/client/src/services/shell.ts#L52)




Returns: <code>[Shell](/api/@dxos/client/classes/Shell)</code>

Arguments: 

`options`: <code>ShellParams</code>



## Properties


## Methods
### [initializeIdentity(options)](https://github.com/dxos/dxos/blob/4d6eae504/packages/sdk/client/src/services/shell.ts#L82)


Create a new identity.
Opens the shell and starts the identity creation flow based on the given options.

Returns: <code>Promise&lt;InitializeIdentityResult&gt;</code>

Arguments: 

`options`: <code>object</code>


### [joinSpace(options)](https://github.com/dxos/dxos/blob/4d6eae504/packages/sdk/client/src/services/shell.ts#L168)


Join an existing space.
Opens the shell and starts the space join flow based on the given options.

Returns: <code>Promise&lt;JoinSpaceResult&gt;</code>

Arguments: 

`options`: <code>object</code>


### [open(layout, options)](https://github.com/dxos/dxos/blob/4d6eae504/packages/sdk/client/src/services/shell.ts#L70)


Open the shell with the given layout.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`layout`: <code>[ShellLayout](/api/@dxos/client/enums#ShellLayout)</code>

`options`: <code>Omit&lt;[LayoutRequest](/api/@dxos/client/interfaces/LayoutRequest), "layout"&gt;</code>


### [setInvitationUrl(request)](https://github.com/dxos/dxos/blob/4d6eae504/packages/sdk/client/src/services/shell.ts#L59)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`request`: <code>object</code>


### [shareIdentity()](https://github.com/dxos/dxos/blob/4d6eae504/packages/sdk/client/src/services/shell.ts#L105)


Invite a new device to join the current identity.
Opens the shell and presents a device invitation.

Returns: <code>Promise&lt;ShareIdentityResult&gt;</code>

Arguments: none




### [shareSpace(options)](https://github.com/dxos/dxos/blob/4d6eae504/packages/sdk/client/src/services/shell.ts#L134)


Invite new members to join the current space.
Opens the shell to the specified space, showing current members and allowing new members to be invited.

Returns: <code>Promise&lt;ShareSpaceResult&gt;</code>

Arguments: 

`options`: <code>object</code>



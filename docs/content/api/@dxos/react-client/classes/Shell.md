# Class `Shell`
<sub>Declared in [packages/sdk/client/dist/types/src/services/shell.d.ts:33]()</sub>


Interface for controlling the shell.

## Constructors
### [constructor(options)]()




Returns: <code>[Shell](/api/@dxos/react-client/classes/Shell)</code>

Arguments: 

`options`: <code>ShellParams</code>



## Properties
### [display]()
Type: <code>[ShellDisplay](/api/@dxos/react-client/enums#ShellDisplay)</code>




## Methods
### [initializeIdentity(\[options\])]()


Create a new identity.
Opens the shell and starts the identity creation flow based on the given options.

Returns: <code>Promise&lt;InitializeIdentityResult&gt;</code>

Arguments: 

`options`: <code>object</code>


### [joinSpace(\[options\])]()


Join an existing space.
Opens the shell and starts the space join flow based on the given options.

Returns: <code>Promise&lt;JoinSpaceResult&gt;</code>

Arguments: 

`options`: <code>object</code>


### [onDisplayChange(cb)]()


Listen for changes to the shell display.

Returns: <code>UnsubscribeCallback</code>

Arguments: 

`cb`: <code>function</code>


### [open(\[layout\], \[options\])]()


Open the shell with the given layout.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`layout`: <code>[ShellLayout](/api/@dxos/react-client/enums#ShellLayout)</code>

`options`: <code>Omit&lt;[LayoutRequest](/api/@dxos/react-client/interfaces/LayoutRequest), "layout"&gt;</code>


### [setInvitationUrl(request)]()




Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`request`: <code>object</code>


### [shareIdentity()]()


Invite a new device to join the current identity.
Opens the shell and presents a device invitation.

Returns: <code>Promise&lt;ShareIdentityResult&gt;</code>

Arguments: none




### [shareSpace(options)]()


Invite new members to join the current space.
Opens the shell to the specified space, showing current members and allowing new members to be invited.

Returns: <code>Promise&lt;ShareSpaceResult&gt;</code>

Arguments: 

`options`: <code>object</code>



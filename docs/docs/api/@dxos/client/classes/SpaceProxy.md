# Class `SpaceProxy`
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<sub>Declared in [packages/sdk/client/src/packlets/proxies/space-proxy.ts:66](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L66)</sub>
=======
<sub>Declared in [packages/sdk/client/src/packlets/proxies/space-proxy.ts:98](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L98)</sub>
>>>>>>> ac192b194 (tunneling)
=======
<sub>Declared in [packages/sdk/client/src/packlets/proxies/space-proxy.ts:99](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L99)</sub>
>>>>>>> 446e8e253 (docs: regen apidoc and ts guide)
=======
<sub>Declared in [packages/sdk/client/src/packlets/proxies/space-proxy.ts:66](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L66)</sub>
>>>>>>> 4df9c9ec7 (wip docs)




## Constructors
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
### [constructor(_clientServices, _modelFactory, _state, databaseRouter)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L87)
=======
### [constructor(_clientServices, _modelFactory, _state, databaseRouter, memberKey)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L119)
>>>>>>> ac192b194 (tunneling)
=======
### [constructor(_clientServices, _modelFactory, _state, databaseRouter)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L122)
>>>>>>> 446e8e253 (docs: regen apidoc and ts guide)
=======
### [constructor(_clientServices, _modelFactory, _state, databaseRouter)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L87)
>>>>>>> 4df9c9ec7 (wip docs)


Returns: <code>[SpaceProxy](/api/@dxos/client/classes/SpaceProxy)</code>

Arguments: 

`_clientServices`: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

`_modelFactory`: <code>ModelFactory</code>

`_state`: <code>Space</code>

`databaseRouter`: <code>[DatabaseRouter](/api/@dxos/client/classes/DatabaseRouter)</code>

## Properties
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
### [invitationsUpdate](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L67)
Type: <code>Event&lt;void | [CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)&gt;</code>
### [stateUpdate](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L68)
Type: <code>Event&lt;void&gt;</code>
<<<<<<< HEAD
### [db](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L126)
Type: <code>[EchoDatabase](/api/@dxos/client/classes/EchoDatabase)</code>
### [internal](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L139)
Type: <code>Internal</code>
### [invitations](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L134)
Type: <code>[CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)[]</code>
### [isActive](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L122)
Type: <code>boolean</code>
### [isOpen](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L117)
Type: <code>boolean</code>
### [key](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L113)
Type: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>
### [properties](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L130)
Type: <code>[Document](/api/@dxos/client/classes/Document)</code>

## Methods
### [_setOpen(open)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L287)
=======
### [database](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L156)
Type: <code>[Database](/api/@dxos/client/classes/Database)</code>
### [experimental](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L165)
=======
### [invitationsUpdate](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L106)
=======
### [invitationsUpdate](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L109)
>>>>>>> 446e8e253 (docs: regen apidoc and ts guide)
=======
### [invitationsUpdate](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L67)
>>>>>>> 4df9c9ec7 (wip docs)
Type: <code>Event&lt;void | [CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)&gt;</code>
### [stateUpdate](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L68)
Type: <code>Event&lt;void&gt;</code>
<<<<<<< HEAD
<<<<<<< HEAD
### [experimental](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L173)
>>>>>>> ac192b194 (tunneling)
=======
### [experimental](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L181)
>>>>>>> 446e8e253 (docs: regen apidoc and ts guide)
Type: <code>Experimental</code>

Next-gen database.
### [internal](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L189)
=======
### [db](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L126)
Type: <code>[EchoDatabase](/api/@dxos/client/classes/EchoDatabase)</code>
### [internal](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L139)
>>>>>>> 4df9c9ec7 (wip docs)
Type: <code>Internal</code>
### [invitations](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L134)
Type: <code>[CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)[]</code>
### [isActive](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L122)
Type: <code>boolean</code>
### [isOpen](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L117)
Type: <code>boolean</code>
### [key](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L113)
Type: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>
### [properties](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L130)
Type: <code>[Document](/api/@dxos/client/classes/Document)</code>

## Methods
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
### [_setOpen(open)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L345)
>>>>>>> 464c6e793 (docs wip)
=======
### [_setOpen(open)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L359)
>>>>>>> ac192b194 (tunneling)
=======
### [_setOpen(open)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L386)
>>>>>>> 446e8e253 (docs: regen apidoc and ts guide)
=======
### [_setOpen(open)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L287)
>>>>>>> 4df9c9ec7 (wip docs)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`open`: <code>boolean</code>
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L205)
=======
### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L227)
>>>>>>> 464c6e793 (docs wip)
=======
### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L240)
>>>>>>> ac192b194 (tunneling)
=======
### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L271)
>>>>>>> 446e8e253 (docs: regen apidoc and ts guide)
=======
### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L205)
>>>>>>> 4df9c9ec7 (wip docs)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
### [createInvitation(\[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L244)
=======
### [createInvitation(\[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L302)
>>>>>>> 464c6e793 (docs wip)
=======
### [createInvitation(\[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L316)
>>>>>>> ac192b194 (tunneling)
=======
### [createInvitation(\[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L343)
>>>>>>> 446e8e253 (docs: regen apidoc and ts guide)
=======
### [createInvitation(\[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L244)
>>>>>>> 4df9c9ec7 (wip docs)


Creates an interactive invitation.

Returns: <code>[CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)</code>

Arguments: 

`options`: <code>InvitationsOptions</code>
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
### [createSnapshot()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L282)
=======
### [createSnapshot()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L340)
>>>>>>> 464c6e793 (docs wip)
=======
### [createSnapshot()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L354)
>>>>>>> ac192b194 (tunneling)
=======
### [createSnapshot()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L381)
>>>>>>> 446e8e253 (docs: regen apidoc and ts guide)
=======
### [createSnapshot()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L282)
>>>>>>> 4df9c9ec7 (wip docs)


Implementation method.

Returns: <code>Promise&lt;SpaceSnapshot&gt;</code>

Arguments: none
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
### [destroy()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L193)
=======
### [destroy()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L216)
>>>>>>> 464c6e793 (docs wip)
=======
### [destroy()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L228)
>>>>>>> ac192b194 (tunneling)
=======
### [destroy()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L259)
>>>>>>> 446e8e253 (docs: regen apidoc and ts guide)
=======
### [destroy()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L193)
>>>>>>> 4df9c9ec7 (wip docs)


Called by EchoProxy close.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
### [getDetails()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L209)
=======
### [getDetails()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L231)
>>>>>>> 464c6e793 (docs wip)
=======
### [getDetails()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L244)
>>>>>>> ac192b194 (tunneling)
=======
### [getDetails()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L275)
>>>>>>> 446e8e253 (docs: regen apidoc and ts guide)
=======
### [getDetails()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L209)
>>>>>>> 4df9c9ec7 (wip docs)


Returns: <code>Promise&lt;SpaceDetails&gt;</code>

Arguments: none
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
### [initialize()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L147)
=======
### [getProperty(key, \[defaultValue\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L287)
=======
### [getProperty(key, \[defaultValue\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L301)
>>>>>>> ac192b194 (tunneling)
=======
### [getProperty(key, \[defaultValue\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L327)
>>>>>>> 446e8e253 (docs: regen apidoc and ts guide)


Returns: <code>any</code>

Arguments: 

`key`: <code>string</code>

`defaultValue`: <code>any</code>
### [getTitle()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L312)


Returns: <code>never</code>

Arguments: none
<<<<<<< HEAD
<<<<<<< HEAD
### [initialize()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L193)
>>>>>>> 464c6e793 (docs wip)
=======
### [initialize()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L205)
>>>>>>> ac192b194 (tunneling)
=======
### [initialize()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L213)
>>>>>>> 446e8e253 (docs: regen apidoc and ts guide)
=======
### [initialize()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L147)
>>>>>>> 4df9c9ec7 (wip docs)


Called by EchoProxy open.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L201)
=======
### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L223)
>>>>>>> 464c6e793 (docs wip)
=======
### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L236)
>>>>>>> ac192b194 (tunneling)
=======
### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L267)
>>>>>>> 446e8e253 (docs: regen apidoc and ts guide)
=======
### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L201)
>>>>>>> 4df9c9ec7 (wip docs)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
### [queryMembers()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L237)
=======
### [queryMembers()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L295)
>>>>>>> 464c6e793 (docs wip)
=======
### [queryMembers()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L309)
>>>>>>> ac192b194 (tunneling)
=======
### [queryMembers()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L336)
>>>>>>> 446e8e253 (docs: regen apidoc and ts guide)
=======
### [queryMembers()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L237)
>>>>>>> 4df9c9ec7 (wip docs)


Return set of space members.

Returns: <code>[ResultSet](/api/@dxos/client/classes/ResultSet)&lt;[SpaceMember](/api/@dxos/client/interfaces/SpaceMember)&gt;</code>

Arguments: none
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
### [removeInvitation(id)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L271)
=======
### [removeInvitation(id)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L329)
>>>>>>> 464c6e793 (docs wip)
=======
### [removeInvitation(id)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L343)
>>>>>>> ac192b194 (tunneling)
=======
### [removeInvitation(id)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L370)
>>>>>>> 446e8e253 (docs: regen apidoc and ts guide)
=======
### [removeInvitation(id)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L271)
>>>>>>> 4df9c9ec7 (wip docs)


Remove invitation from space.

Returns: <code>void</code>

Arguments: 

`id`: <code>string</code>
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
### [setActive(active)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L222)
=======
### [setActive(active)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L252)
>>>>>>> 464c6e793 (docs wip)
=======
### [setActive(active)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L266)
>>>>>>> ac192b194 (tunneling)
=======
### [setActive(active)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L292)
>>>>>>> 446e8e253 (docs: regen apidoc and ts guide)
=======
### [setActive(active)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L222)
>>>>>>> 4df9c9ec7 (wip docs)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

<<<<<<< HEAD
<<<<<<< HEAD
`active`: <code>boolean</code>
=======
`active`: <code>boolean</code>
### [setProperty(key, \[value\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L320)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`key`: <code>string</code>

`value`: <code>any</code>
### [setTitle(title)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L305)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`title`: <code>string</code>
>>>>>>> 464c6e793 (docs wip)
=======
`active`: <code>boolean</code>
>>>>>>> 4df9c9ec7 (wip docs)

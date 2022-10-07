# Class `PartyStateMachine`
> Declared in [`packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts`](https://github.com/dxos/protocols/blob/main/packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts#L26)

Validates and processes credentials for a single party.
Keeps a list of members and feeds.
Keeps and in-memory index of credentials and allows to query them.

## Constructors
```ts
new PartyStateMachine(
_partyKey: PublicKey
)
```

---
- PartyStateMachine : Class
- constructor : Constructor
- new PartyStateMachine : Constructor signature
- _partyKey : Parameter
- _credentials : Property
- _feeds : Property
- _genesisCredential : Property
- _members : Property
- onCredentialProcessed : Property
- onFeedAdmitted : Property
- onMemberAdmitted : Property
- credentials : Accessor
- credentials : Get signature
- feeds : Accessor
- feeds : Get signature
- genesisCredential : Accessor
- genesisCredential : Get signature
- members : Accessor
- members : Get signature
- _canAdmitFeeds : Method
- _canAdmitFeeds : Call signature
- key : Parameter
- _canInviteNewMembers : Method
- _canInviteNewMembers : Call signature
- key : Parameter
- process : Method
- process : Call signature
- credential : Parameter
- fromFeed : Parameter

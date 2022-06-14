# Credentials

<img src="diagrams/credentials.drawio.svg">


## Questions

- Key chain
  - How is the chain of authority established? Who validates the signed messages that are a part of the keychain?
  - Is it conflating party credentials (member admit) with profile credentials (device admit)?
- How does this relate to member authentication?
  
  Conceptually there must be a verification function in the form of:
  ```
  verify(partyState, credentials, presentation)
  ```

  where:
  
  `partyState` - closure of all party credential messages that were recoded.
  `credentials` - additional credential messages that establish the chain-of-authority for the member that is being verified.
  `presentation` - one-time presentation with a challenge.

  Example:

    Party state: 
      - `admitToParty(to=party-1, member=identity-1)`

    Credential:
      - `admitToProfile(to=identity-1, member=device-1)`

    Presentation:
      A challenge signed by `device-1` key.


## Intuition about credentials

Conceptually we can think about access control as being handled by a set of state machines with a signature of:

```
process(CredentialMessage[]) -> Key[]
```

They process a list of credential messages and return a set of keys that have access to certain resource.

For example:
 - Feed DAG is built by such state machine.
 - List of party members is built by such state machine.
 - List of devices in an identity is built by such state machine.

**Party State-Machine is a composition of those smaller state machines**.

The messages that are fed into those state machines may come from control feeds or be ephemeral.

Consider member authentication example above. We could pass credentials from party-state as well as those presented by the member into an appropriate state-machine and as a result get back the set of device keys that are members of this party. The rest of the verification is just checking that the presented key is in that set and verifying the presentation.


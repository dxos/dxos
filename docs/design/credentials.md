# Credentials Design Doc

## Glossary

Agent - p2p participant (i.e., bot or user).

Keyring - storage for keys (on disk or in-memory).

KeyChain - Set of credential messages establishing a chain of trust between keys.

Invitation - process (sometimes interactive) of admitting a new member to a party (data or HALO).

Credential - signed claim.

HALO party - set of credentials, and data (e.g., preferences) for a given agent (i.e., identity). Replicated between all devices of the identity.

Identity key - public/private key pair for agents.

Device key - public/private key pair of particular a node belonging to an agent.
Each device contains a keyring and a replica of the HALO party.

Feed - hash-linked append-only signed log of immutable messages.

> Profile?
>
> HALO - halo party
> device => Identity {HALO, keyring = {identity pk, device sk, feeds sk }}

## Processes

### HALO creation

1. Generate identity key-pair.
1. Generate device key-pair.
1. Generate feed key-pair.
1. Write HALO PartyGenesis credential:
  - Establishes the genesis of the HALO party.
  - Admits the device key.
  - Admits the feed.
  - Identity key is used as the HALO party key so it is automatically admitted. [use hash of identity key as party key?, key rotation?]
  - Signed by: identity key, device key, feed key. [why?]
1. Write IdentityGenesis (KeyAdmit) message.
  - Admits identity key.
  - Signed by: identity key.
1. Write IdentityInfo message
  - Contains the identity display name string.
  - Skipped if there's no display name for this identity.
  - Signed by: identity key. [sign by device key instead?]
1. Write DeviceInfo message
  - Contains the device display name string.
  - Skipped if there's no display name for this device.
  - Signed by: device key.
1. Create initial set of metadata items in HALO party database.
1. Destroy the secret key of identity key.

> Genesis feed

### Data party creation

1. Generate party key-pair.
1. Generate feed key-pair.
1. TODO

> Genesis feed

### Credentials state machine

TODO

#### Key chains

TODO

### Authenticator

TODO
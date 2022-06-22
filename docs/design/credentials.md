# Credentials Design Doc

## Glossary

Agent - p2p participant (i.e., bot or user).

Keyring - storage for keys (on disk or in-memory).

KeyChain - Set of credential messages establishing a chain of trust between keys.

Invitation - process (sometimes interactive) of admitting a new member to a party (data party or HALO party).

Credential - signed claim.

HALO party - set of credentials, and data (e.g., preferences) for a given agent (i.e., identity). Replicated between all devices of the identity.

Identity key - public/private key pair for agents.

Device key - public/private key pair of particular a node belonging to an agent.
Each device contains a keyring and a replica of the HALO party.

Feed - hash-linked append-only signed log of immutable messages.

Feed DAG - the graph formed by feeds admitting other feeds via FeedAdmit messages.

> Profile?
>
> HALO - halo party
> device => Identity {HALO, keyring = {identity pk, device sk, feeds sk }}

## Credential message

> TODO: Explain structure

## Key chain

> TODO

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

> TODO: Device key chain is formed after the HALO is created. Explain the process.

> Genesis feed

### Data party creation

1. Generate party key-pair.
1. Generate feed key-pair.
1. Write PartyGenesis credential message
  - Admits the feed key.
  - Admits the party key.
  - Signed by: party key, feed key.
  - [With genesis feed party-key=feed-key so we wouldn't have to admit them]
1. Wrap and write the IdentityGenesis message.
  - Copied from HALO party.
  - Additionally signed by the party key.
  - [is the original service (i.e., HALO party) of the IdentityGenesis message important?]
1. Write FeedAdmit message
  - Admits the feed key.
  - Signed by the device key-chain.
1. Copy the IdentityInfo message from the HALO party.
  - May be skipped if doesn't exist.
  - Additionally signed by device key-chain.
1. Create party metadata item in the database.
1. Destroy the secret key for the party key.

> TODO: Difference between KeyAdmit and FeedAdmit messages.
> TODO: Separate feed keys into their own domain, disallow feed keys to sign credentials.
> Genesis feed

## Credentials state machine

> TODO
> - Initial state
> - Sets of keys tracked
> - Trusted keys
> - Invitations
> - Info messages
> - Admitted by
> - Use by message selector (i.e. message orderer).

## Authenticator

> TODO

## Proposal: Genesis feed.

Special feed that is identified and signed by the party key.

Contains credential messages that establish the party genesis, admit the first member and the first member's feed.

Genesis feed is the root of the feed DAG.
Genesis feed is the definitive starting point for the party state machine.
Only the party public key, which is also the genesis feed key, is required to discover nodes on the network, authenticate with them, start replicating, and processing the party credentials in the party state machine.
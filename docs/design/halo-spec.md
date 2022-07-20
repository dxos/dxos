# HALO Spec <!-- omit in TOC -->

- [1. Introduction](#1-introduction)
- [2. Terminology](#2-terminology)
- [3. Spec](#3-spec)
- [4. Design](#4-design)
  - [4.1. Issues](#41-issues)
  - [4.2. Trust and Threats](#42-trust-and-threats)
    - [4.2.1. Aspects of Trust](#421-aspects-of-trust)
- [5. Reference](#5-reference)
  - [5.1. Credential message](#51-credential-message)
  - [5.2. Key chain](#52-key-chain)
  - [5.3. Credential message types](#53-credential-message-types)
    - [5.3.1. Envelope](#531-envelope)
    - [5.3.2. Genesis](#532-genesis)
    - [5.3.3. KeyAdmit](#533-keyadmit)
    - [5.3.4. FeedAdmit](#534-feedadmit)
    - [5.3.5. FeedGenesis](#535-feedgenesis)
    - [5.3.6. IdentityInfo](#536-identityinfo)
    - [5.3.7. DeviceInfo](#537-deviceinfo)
    - [5.3.8. Invitations](#538-invitations)
- [6. Processes](#6-processes)
  - [6.1. HALO creation](#61-halo-creation)
  - [6.2. ECHO Space creation](#62-echo-space-creation)
- [7. Credentials state machine](#7-credentials-state-machine)
- [8. Authenticator](#8-authenticator)
- [9. Proposal: Genesis feed.](#9-proposal-genesis-feed)
- [10. Notes](#10-notes)
- [11. References](#11-references)


## 1. Introduction

HALO is a set of protocols and components used to secure decentralized networks.
The HALO protocols enable self-sovereign identity, decentralized identifiers, verifiable credentials, and other mechanisms relating to the security of decentralized systems.
HALO is implemented useing cryptographically secure, privacy respecting, and machine-verifiable messages.

Users and other network participants (Agents) maintain a HALO, which encompasses their identity, digital address book, and access control rights to digital assets withint the DXOS ecosystem.


## 2. Terminology

***Agent*** -
Participant (i.e., bot or user) in the peer-to-peer network.

***Chain of Trust***-
Credentials contain the public keys of both the Issuer and Subject and can be trivially verified by the recipient.
Messages may contain a DAG of Credentials where parent Credentials provide evidence of the validity of child Credentials.
For example, a Root Credential may assert a Claim that a given Subject (A) has ownership of a particular asset;
A subsequent Credential may then assert that a different Subject (B) has a different right conferred by the owner (A) of the asset.

***Claim***-
An assertion made about a subject.
Claims may represent ownership of digital assets, access control, status, and other properties determined by the Issuer.

***Credential*** - 
A set of verifiable Claims issued by an Issuer to a Subject, typically used during requests to third-Space services.
Credentials are signed by the Issuer to prove their validity.
Typically the Subject signs the Credential to prove the validity of the request.

***Device*** - 
Peer belonging to an Agent that belongs to a HALO Space.

***ECHO Space*** - 
Decentralized graph database instance secured by the HALO protocols.

***Feed*** - 
Hash-linked append-only signed log of immutable messages.

***Feed DAG*** - 
Graph formed by feeds admitting other feeds via FeedAdmit messages.

***HALO Space*** - 
Decentralized credentials database.

***Identity key*** - 
Public/private key pair for agents.

***Invitation*** - 
The process (sometimes interactive) of admitting a new member to a Space (ECHO or HALO).

***Issuer** -
Entity that creates Credentials for a given Subject.

***Keychain*** - 
Set of credential messages establishing a linear chain of trust between credentials.
TOOD: Example.

***Keyring*** - 
Storage for keys (on disk or in-memory).

***Party*** -
Old term for Space.

***Presentation***
Message containing a Credential that is signed by the Subject.

***Profile*** -
Set of metadata associated with an Agent.

***Space*** -
Shared collaborative data graph implemented by the ECHO protocol and secured by HALO.

***Subject*** -
Entity about which Claims are made.

***Verifier*** -
Entity that is able to verify a Credential (or Presentation).


## 3. Spec

The following section descibes the specification for HALO.

1. Identity
   - Agents can create and manage identities.
   - Agents can recover an identity from a 24-word seed phrase.
   - Agents can manage multiple isolated identities on a single device.
   - Agents have a public decentralized identifier that can be shared with others.
2. Profiles
   - Agents can manage a globally accessible public document that contains metadata they wish to share (e.g., display name).
   - Profiles can be discovered across the network by the agent's public identifier.
3. Credential Management
   - Entities can create and share credentials that can represent an extensible set of verifiable claims.
   - Agents can manage a decentralized set of credentials.
4. Device management
   - Agents can manage a set of verified devices.
   - Devices can be revoked.
   - Devices can be used to recover identity.
5. Contacts
   - Agents can maintain a decentralized set of contacts and profile documents for other agents across the network.
6. Security
   - All information can be encrypted on local storage (secured by password).
   - The system can be implemented cross-platform (e.g., Web browser, Mobile app, Terminal client, backend service.)


## 4. Design

- NOTE: Spaces are the new name for Parties.

- Each Agent (User or Bot) has:
  - An Identity public key.
  - A public Profile document (e.g., IPFS file discovered by a Peer DID?)
    - Peer DID resolve to DID Document via a Naming Service.
    - ISSUE: Cannot use IPNS due to single private key limitation.
    - ISSUE: KUBEs implement a federated DXNS and DID resolver.
      - DXNS is hybrid KUBE p2p/blockchain.
      - DXNS maintains a map of name (DXN) => Document (typed record) with a set of Credentials (that contains a set of public keys that have Issuer over the document).
  - A Set of devices that manage secure private keys and credentials.
  - A private decentralized HALO that contains:
    - A set of Credentials that represent various decentralized claims (e.g., Blockchain accounts, KUBE access, external Web2 tokens).
    - A set of Device public keys (and metadata).
    - A Circle that contains a set of Agent public keys (DIDs?) and profiles (e.g., cached DID Profile documents)

- A Credential contain a Subject and a Claim signed by an Issuer.
- Spaces maintain a DAG of credentials.
- The space itself is the root Issuer that signs a set of Genesis messages using a temporary Private key.
- The genesis messages contain the root credentials that anchor the "chain of trust".

- Agents are identified by their Identity public key.
- The Identity key may be used to look-up the agent's profile.
  - TODO: How to lookup profile (e.g., DID document).

- Credentials may represent (multiple) roles for Agents (e.g., Admin, Writer, Reader).
- Credential may represent:
  1. Agent admission (ECHO Space only): `{ subject: Agent; claim: Role; Issuer: Genesis|Device }` (applies to all Agent's devices).
  2. Device admission: `{ subject: Device: claim: Agent Proxy; Issuer: Genesis|Device }`: Gives the Device transitive rights to act on behalf of an Agent.
  3. Feed admission: `{ subject: Device; claim: Valid; Issuer: Device }`
  - When an Agent's Device attempts to join the Space, it presents a credential signed by an existing admitted Device.
  - Alternatively: The new Device may present a chain of credentials that are anchored by the Agent (e.g., Agent => Device 1 => Device 2) generated from the Agent's HALO.
    - ISSUE: How to deal with device revocation (e.g., Device 1 is now invalid).
    - Maintain map of authorities.

- Each Agent has Public key.
- Agent's have multiple devices, each of which have a Public/Private key.
- Each Agent maintins a public Profile document (e.g., DID document stored as IPFS file).
- The Profile document may be resolved by the network using Peer DID resolution.

### 4.1. Issues

- What mechanism does Peer DID resolution? Needs Naming Service?
- TODO(pierre): Privacy review (for Spaces and Peer signaling).
  - ISSUE: A time-salted hash of the associated Public key may be used to discover the Space (i.e., MESH discovery key).
  - This hash may be transmitted publicly (e.g., as a discovery key for signaling) and provides one degree of privacy.
- TODO: Credential expiration/revocation and finality (e.g., by epoch).
- TODO: Use blockchain hash as timestamp for revocation messages.

### 4.2. Trust and Threats

#### 4.2.1. Aspects of Trust

- Availability: Can I find it from any node in the network.
- Correctness: Is the value verifiable? Can I invalidate fakes?
- Consensus and Finality: Can I determine that all nodes agree?
- Censorship Resistance: Am I seeing all results?

> - TODO: Convert to table.

- KUBE/MESH network for availability and correctness.
  - ISSUE: Cannot prevent censorship.
  - ISSUE: Implement peer verification using unique discovery keys?
- IPFS for availability (can validate document by hash)
- DXNS:
  - By trusted subnets.
  - By global blockchain.
- ECHO Spaces by chain-of-trust of Credentials (within scope of ECHO).
- HALO

> - TODO: DNS
> - TODO: Incentives







HALO protocols are influenced by the W3C specs for [Verifiable credentials](https://www.w3.org/TR/vc-data-model/#terminology



## 5. Reference

### 5.1. Credential message
 
A Credential message consists of:
- Signed part:
  - Timestamp of credential creation.
  - Nonce as a randomly generated by string. [Allow different signatures to have different nonces, allowing for more efficient presentation]
  - Dynamically typed payload encoded via `google.protobuf.Any`.
- List of signatures, each having:
  - The signing public key.
  - The signature itself.
  - Optional KeyChain.

ED25519 curve is used for signatures via [hypercore-crypto](https://www.npmjs.com/package/hypercore-crypto) package.

### 5.2. Key chain

> See packages/common/protocols/src/proto/dxos/halo/keys.proto

A set of credential messages that establishes a chain of trust between the signing key and the trusted keys.
Allows for delegation of Issuer.

KeyChain is stored in a tree-like data structure.
Each entry consists of:
- Public key being described.
- A signed credential message where the public key is the subject of the credential.
- Zero or more parent KeyChains establishing the trust of the keys that signed the credential.

Example:

Parties admit identity keys as members. When a device signs a credential, it produces a signature using it's own device key and attaches a KeyChain containing a KeyAdmit message, admitting the device key to the HALO.

> Q: What's the difference between including KeyChain as a parent of a different KeyChain vs having the credential message of that KeyChain entry be signed with the first KeyChain.

> TODO: It seems only the signatures of credential messages are verified and the claims are ignored.

### 5.3. Credential message types

#### 5.3.1. Envelope 

> See packages/common/protocols/src/proto/dxos/halo/Space.proto

Wraps another credential message specifying the Space key and allowing to add more signatures.

#### 5.3.2. Genesis

> See packages/common/protocols/src/proto/dxos/halo/Space.proto

The start-of-Issuer record for the Space.
Contains:
- Space key.
- Key of the initial feed to be admitted.
- Key of the initial member to be admitted.

Signed by the Space key itself, as well as the subject keys.

#### 5.3.3. KeyAdmit

> See packages/common/protocols/src/proto/dxos/halo/Space.proto

Admits a new member key (identity or device key) to the Space.

Must be signed by previously admitted member.

#### 5.3.4. FeedAdmit

> See packages/common/protocols/src/proto/dxos/halo/Space.proto

Admit a single feed to the Space.
This message must be signed by the feed key to be admitted, also by some other key which has already been admitted (usually by a device pseudonym key).

FeedAdmit messages are used to incrementally build the Feed DAG.

#### 5.3.5. FeedGenesis

> See packages/common/protocols/src/proto/dxos/halo/Space.proto

The start-of-Issuer record for the Feed.
Contains information about the owner of the feed.
The owner must be a key previously admitted to the Space

> NOTE: Currently unused.

#### 5.3.6. IdentityInfo

> See packages/common/protocols/src/proto/dxos/halo/identity.proto

Additional, descriptive information about an Identity. Must be signed by the Identity's key.

#### 5.3.7. DeviceInfo

> See packages/common/protocols/src/proto/dxos/halo/identity.proto

Additional, descriptive information about a Device. Must be signed by the Device's key.

#### 5.3.8. Invitations

> TODO: describe credentials used in invitations

Ephemeral credential message that is sent during handshake for replication authentication.

Contains:
 - Space key.
 - Device key.
 - Identity key.
 - Feed key.
 - Optional FeedAdmit credential to be notarized by the authenticator so that new peers can get their feeds included in the Feed DAG.

## 6. Processes

### 6.1. HALO creation

1. Generate identity key-pair.
1. Generate device key-pair.
1. Generate feed key-pair.
1. Write HALO SpaceGenesis credential:
    - Establishes the genesis of the HALO Space.
    - Admits the device key.
    - Admits the feed.
    - Identity key is used as the HALO Space key so it is automatically admitted. [use hash of identity key as Space key?, key rotation?]
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
1. Create initial set of metadata items in HALO Space database.
1. Destroy the secret key of identity key.

> TODO: Device key chain is formed after the HALO is created. Explain the process.

> Genesis feed

### 6.2. ECHO Space creation

1. Generate Space key-pair.
1. Generate feed key-pair.
1. Write SpaceGenesis credential message
    - Admits the feed key.
    - Admits the Space key.
    - Signed by: Space key, feed key.
    - [With genesis feed Space-key=feed-key so we wouldn't have to admit them]
1. Wrap and write the IdentityGenesis message.
    - Copied from HALO Space.
    - Additionally signed by the Space key.
    - [is the original service (i.e., HALO Space) of the IdentityGenesis message important?]
1. Write FeedAdmit message
    - Admits the feed key.
    - Signed by the device key-chain.
1. Copy the IdentityInfo message from the HALO Space.
    - May be skipped if doesn't exist.
    - Additionally signed by device key-chain.
1. Create Space metadata item in the database.
1. Destroy the secret key for the Space key.

> TODO: Difference between KeyAdmit and FeedAdmit messages.
> TODO: Separate feed keys into their own domain, disallow feed keys to sign credentials.

## 7. Credentials state machine

> TODO
> - Initial state
> - Sets of keys tracked
> - Trusted keys
> - Invitations
> - Info messages
> - Admitted by
> - Use by message selector (i.e. message orderer).

## 8. Authenticator

> TODO

## 9. Proposal: Genesis feed.

Special feed that is identified and signed by the Space key.

Contains credential messages that establish the Space genesis, admit the first member and the first member's feed.

Genesis feed is the root of the feed DAG.
Genesis feed is the definitive starting point for the Space state machine.
Only the Space public key, which is also the genesis feed key, is required to discover nodes on the network, authenticate with them, start replicating, and processing the Space credentials in the Space state machine.


## 10. Notes

- Credential: issuer (Issuer); subject; claim.

- User's private key is not used for signing (just recovery of HALO).
- Device is a signing Issuer for a user (e.g., to create membership credenitals).
- Device presents HALO credentials to ECHO parties to join. (HALO DAG joined with ECHO DAG)
- Device graph as part of HALO. Revocation. 
  - Optionally: Blockchain registration to resolve forks. 
  - Optionally: Publish Github credential (claim) to chain/HALO in order to recover.
- Credentials should generally have narrow claims (separation of concerns).
- Devices joining an ECHO Space are like offline invitations (i.e., the joiner presents a credential).


## 11. References

1. [W3C Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model/)









# HALO Spec <!-- omit in toc -->

<!-- @toc -->

*   [1. Introduction](#1-introduction)
*   [2. Terminology](#2-terminology)
*   [3. Specification](#3-specification)
*   [4. Design](#4-design)
    *   [4.1. Keys and Credentials](#41-keys-and-credentials)
        *   [4.1.1. HALO Genesis](#411-halo-genesis)
        *   [4.1.2. Device Management](#412-device-management)
        *   [4.1.3. Recovery](#413-recovery)
    *   [4.2. Protocol Definitions](#42-protocol-definitions)
        *   [4.2.1. Credentials](#421-credentials)
        *   [4.2.2. HALO Genesis](#422-halo-genesis)
        *   [4.2.3. Device Authorization and Authentication](#423-device-authorization-and-authentication)
        *   [4.2.4. HALO Recovery](#424-halo-recovery)
        *   [4.2.5. Profiles](#425-profiles)
        *   [4.2.6. Circles](#426-circles)
        *   [4.2.7. DID Documents](#427-did-documents)
    *   [4.3. ECHO Spaces](#43-echo-spaces)
        *   [4.3.1. Protocol Definitions](#431-protocol-definitions)
        *   [4.3.2. Genesis](#432-genesis)
        *   [4.3.3. Agent Authorization](#433-agent-authorization)
        *   [4.3.4. Device Authentication](#434-device-authentication)
    *   [4.4. Design Issues](#44-design-issues)
*   [5. Implementation Details](#5-implementation-details)
    *   [5.1. Credential message](#51-credential-message)
    *   [5.2. Keychain](#52-keychain)
    *   [5.3. Space (space) state machines](#53-space-space-state-machines)
    *   [5.4. HALO Creation](#54-halo-creation)
    *   [5.5. ECHO Space creation](#55-echo-space-creation)
*   [6. Security Concerns](#6-security-concerns)
    *   [6.1. Aspects of Trust](#61-aspects-of-trust)
    *   [6.2. Trust Models](#62-trust-models)
    *   [6.3. compression](#63-compression)
    *   [6.4. Invitations](#64-invitations)
*   [7. References](#7-references)
*   [8. Appendix](#8-appendix)
    *   [8.1. Protocol Schema](#81-protocol-schema)
    *   [8.2. Example](#82-example)

## 1. Introduction

The HALO protocols enable self-sovereign identity, decentralized identifiers, verifiable credentials, and other mechanisms relating to the security of decentralized systems.
HALO is implemented useing cryptographically secure, privacy respecting, and machine-verifiable messages.

Users and other network participants (Agents) maintain a HALO, which encompasses their identity, digital address book, and access control rights to digital assets withint the DXOS ecosystem.

## 2. Terminology

The following terms are capitalized when referenced in the document.

***Agent*** -
Participant (i.e., bot or user) in the peer-to-peer network.

***Authentication*** -
Mechanism to determine the identity of a given Agent.

***Authorization*** -
Mechanism to specify or determine the capabilities of a given Agent.

***Chain of Trust*** -
Credentials contain the public keys of both the Issuer and Subject and can be trivially verified by the recipient.
Messages may contain a DAG of Credentials where parent Credentials provide evidence of the validity of child Credentials.
For example, a Root Credential may assert a Claim that a given Subject (A) has ownership of a particular asset;
A subsequent Credential may then assert that a different Subject (B) has a different right conferred by the owner (A) of the asset.

***Circle*** -
A set of keys and metadata relating to a set of network Agents known to a given Agent.

***Claim*** -
An assertion made about a subject.
Claims may represent ownership of digital assets, access control, status, and other properties determined by the Issuer.

***Credential*** -
A set of verifiable Claims issued by an Issuer to a Subject, typically used during requests to third-Space services.
Credentials are signed by the Issuer to prove their validity.
Typically the Subject signs the Credential to prove the validity of the request.

***Device*** -
Peer belonging to an Agent that belongs to a HALO Space.

***DID*** -
W3C specification for a Decentralized Identifier which can be used to authenticate an Agent.

***DXNS*** -
A Federated Decentralized Naming Service that resolved structure document by an associated public key, DXN, DID, Peer DID, or domain name.

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
The process (sometimes interactive) of admitting a new Agent to a Space (ECHO or HALO).

***Issuer*** -
Entity that creates Credentials for a given Subject.

***KUBE*** -
DXOS network devices running the KUBE daemon process and services.

***MESH*** -
Peer-to-peer network supported by KUBE nodes.

***Credential chain*** -
Set of credential messages establishing a linear chain of trust between credentials.
TODO: Example.

***Keyring*** -
Storage for keys (on disk or in-memory).

***space*** -
Set of Agents that can access a digital resource (such as an ECHO Space).

> **NOTE:** space was the old term for a Space.

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

## 3. Specification

A HALO is a secure, replicated, peer-to-peer dataset containing an Agent's decentralized credentials.
The HALO is used to manage identity, credentials, Devices, and the Agent's Circle.
The HALO protocols are implemented by components that form part of smart clients that can run securely cross-platform (e.g., Web browser, Mobile app, Terminal client, backend service.)

*   **Identity**
    *   Agents can create and manage multiple identities.
    *   Agents can recover an identity from a 24-word seed phrase.
    *   Identities can be used across Devices without sharing private keys.
    *   Agents can manage and use multiple isolated identities on a single Device.
    *   Agents have a public decentralized identifier that can be shared with others.
    *   Identities can be used to establish connections between Devices belongong to Agents on the MESH network.

*   **Profiles**
    *   Agents can manage a globally accessible public document that contains metadata they wish to share (e.g., display name).
    *   Profiles can be discovered across the network by the agent's public identifier.

*   **Credential Management**
    *   Entities can create and share credentials that can represent an extensible set of verifiable claims.
    *   Agents can manage a decentralized set of credentials.

*   **Device Management**
    *   Agents can manage a set of verified Devices.
    *   Devices can be revoked.
    *   Devices can be used to recover identity.

*   **Circles**
    *   Agents can maintain a decentralized set of contacts and profile documents for other agents across the network.

## 4. Design

All Agents maintain a HALO, which represents their identity and decentralized credentials.

A HALO consists of a device-local **key store** and a **metadata store** replicated across the Agent's Devices.

The HALO contains:

*   A set of device-local private keys used for signing messages.
*   A set of credentials that represent various decentralized claims (e.g., ECHO Spaces, KUBE access control, Blockchain accounts, external Web2 tokens).
*   A set of public keys and metadata (e.g., cached DID Profile documents) representing the Agent's Circle.

### 4.1. Keys and Credentials

HALO manages the following public and private keys.

| Key      | Type    | Description                              |
| -------- | ------- | ---------------------------------------- |
| Space    | Public  | Public key representing a HALO Space.    |
| Identity | Public  | Represents the Agent's public identity.  |
| Device   | Private | Signing key used to create credentials.  |
| Feed     | Private | Signing key used to write feed messages. |
| Recovery | Private | Used to recover a HALO.                  |

All private keys are stored in a device-local password-protected encrypted key store and should never exported outside of the device.

Private keys are used to sign messages, which may include credentials.
Credentials form a chain of trust that implement delegated authority such that multiple devices are able to create credentials on behalf of the Agent.

The diagram below illustrates the chain of trust that is created during HALO Genesis and at subsequent points during the life-cycle of the HALO.

<br>

![Credentials](./diagrames/../diagrams/halo-genesis.drawio.svg)

This sections summarizes the principal HALO mechanisms with further details in the sections below.

#### 4.1.1. HALO Genesis

During genesis public/private key-pairs are created for:

*   a) the HALO Space;
*   b) the Agent's Identity;
*   c) the Device that is being used to create the HALO;
*   d) an initial Feed that is used to store credentials.

**(1)**
The Space key is used to create a self-signed message that anchors the chain of trust. The Space is both the Issuer and Subject of the credential.
The Space's public key is used later to identity the HALO for purposes of replication on the network.

**(2)**
The Space key is then used to sign a credential that designates the Agent's Identity as the owner of the HALO.

**(3)**
The Identity key is then used to Admit the first Device to the Agent's Identity.
This grants authority to the Device to sign additional credentials.

**(4)**
The Device key is then used to Admit Feeds to the Space.
All messages written to the Feed are signed using the Feed's private key to guarantee the integrity of all messages on the Feed.

Once the Genesis credentials have been created, the Space and Identity private keys are destroyed.

#### 4.1.2. Device Management

Once a Device has been admitted to the Space, it has authority to add and remove subsequent Devices.

**(5)**
The Device creates and signs a Credential that admits the new Device.
As above, the newly admitted Device creates a credential to admit its feed(s) to the HALO Space.

#### 4.1.3. Recovery

As an additional security measure, a Recovery key can be created and recorded by the User outside of the HALO.
The Recovery key is usually represented as a 24-word keyphrase and is sometimed referred to as a Paper key.

**(6)**
Recovery keys can be created by any Device.

**(7)**
Recovery keys themselves act as a pseudo-device that can be used to Admit new Devices as above.

> NOTE: Devices additionally have a passphrase that is used to encrypt local storage and may be used as a challenge during the creation of subsequent credentials.

<br>
<br>
<br>

> TODO(burdon): Organize sections below.

### 4.2. Protocol Definitions

The HALO protocol definitions are defined in the [References](#8-appendix) section.

> TODO(burdon): Reorganize below with respect to examples (extract process descriptions from features.)

#### 4.2.1. Credentials

*   Credentials are represented by a schema defined by the HALO protocol.
    The schema format is inspired by the [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model).
*   Claims may represent ownership or access to digital assets, including KUBE nodes and ECHO Spaces.

<!-- @code(../../packages/halo/halo-protocol/src/proto/defs/credentials.proto#Credential, link) -->

<sub>`@dxos/halo-protocol`[`[src/proto/defs/credentials.proto]`](../../packages/halo/halo-protocol/src/proto/defs/credentials.proto)</sub>

```protobuf
message Credential {
  optional PubKey id = 1;
  optional PubKey issuer = 2;
  optional Timestamp issuance_date = 3;
  optional Timestamp expiration_date = 4;
  optional bytes expiration_ref = 5;
  optional Claim subject = 10;
  optional Proof proof = 11;
}
```

#### 4.2.2. HALO Genesis

1.  Agents first create an Ed25519 key pair that represents an Identity key.
2.  An IdentityGenesis credential is created an signed by the Identity key.
3.  One or more IdentityRecovery credentials are signed by the Identity key, they setup the keys (with 24-word seed-phrases)
    that can be used to recover the identity in case no devices are available.
4.  A space keypair is generated for the ECHO Space. It acts as a communication medium between Agent's devices and a credentials store. All of the mentioned credentials are recorded in that space.
    a. Normal space-creation credential sequence is written to the space: SpaceGenesis, spaceMember, AdmittedFeed.
    b. A hash of the Space public key is used as a discovery key (or topic) to locate other peers that belong to the Halo.
    c. HaloSpace credential is created and signed by the identity key. It links the space key with the identity.
5.  Device keypair is generated. AuthorizedDevice credential is created.
6.  Optional IdentityProfile message can be written to set the profile information, such as username.
7.  **NOTE**: The identity private key is only used to generate the HALO.

#### 4.2.3. Device Authorization and Authentication

1.  Each Device creates a Ed25519 key pair and maintains a secure key store.
2.  The key store is encrypted and optionally protected by a password and/or second factor authenticator.
3.  Devices must be authorized and authenticated before joining a HALO.
4.  Devices may only join one HALO.
5.  Authorization requires a peer-to-peer session where the existing and joining Devices exchange public keys. This handshake may require a second factor authentication.
6.  The existing Device writes a `Device Auth` message to the HALO that includes the joining Device's public key.

*   The `Device Auth` message may contain permissions that scope the capabilities of the Device (e.g., Admin, Write, Read), and an expiration time that necessitates re-authorization later on.

1.  The joining Device authenticates by presenting a signed message using the Device key corresponding to the `Device Auth` message.

*   The message contains the Device's feed keys; the existing Device writes a `Feed Admit` message containing these keys to the HALO.
*   This determines which feeds replicated by each Device peer.

1.  Devices may write revocation messages to the HALO, which cancel prior authorizations.

*   ISSUE: There is the potential for a race, whereby two Devices may attempt to revoke access to the other. Revocation may require a multi-Device "vote" or a second factor authentication method.

The diagram below illustrates the chain of trust formed when a HALO is constructed and the Agent authorizes and authenticates a second device.

![Credentials](./diagrams//halo-credentials.drawio.svg)

> **NOTE**: Device Authorization and Authentication does not itself ***require*** Credentials.
> Authorized Devices write `Device Auth` authorization messages to their corresponding feed
> and Devices present authentication messages when joining the swarm.
> However, Credentials ***are*** written to the HALO so that they can be presented to ECHO Spaces to demonstrate a chain of trust for authorized Devices (see below).

#### 4.2.4. HALO Recovery

*   New Decices can be admitted to the Halo using the authorization mechanism below.
*   Alternatively, Agents with the recovery key can self-admit a Device to the Halo.
*   The Recovery key can be used to create an `Device Auth` message allowing the Device to connect to the Halo swarm.
*   Another Device can then issue a `Feed Admit` message to enable replication to begin.

#### 4.2.5. Profiles

*   Agents can create and update a content addressable Profile Document that conforms to a HALO protocol buffer schema.
*   Profile Documents contains standard meta data (e.g., display name) as well as custom properties that can be set by the user and decentralized applications.
*   Profile Documents are stored by a KUBE-supported IPFS network and accessed via DXNS.
*   **NOTE**: IPNS is impractical since it only support single private-key access.

#### 4.2.6. Circles

*   The HALO database contains a set of records representing third-space agents.
*   These records contain Agent keys (e.g., DIDs) and other metadata (e.g., cached Profiles).
*   The HALO may also contain claims relating to other Agents.

#### 4.2.7. DID Documents

*   Agents may publish a [DID Document](https://www.w3.org/TR/did-core/#abstract) that can be used by external systesm to authenticate the Agent.
*   DID Documents may be resolved by the assosicated DID via a decentralized DID controller (e.g., blockchain) or a trusted peer-to-peer network (e.g., KUBE).

### 4.3. ECHO Spaces

An ECHO Space is a collaborative peer-to-peer graph database secured by the HALO protocols.
Internally ECHO Spaces are used to create decentralized HALO databases.

#### 4.3.1. Protocol Definitions

The ECHO protocol definitions are defined by [protobuf schema](https://github.com/dxos/dxos/tree/main/packages/common/protocols/src/proto/dxos/echo).

TODO: Add table describing messasges.

#### 4.3.2. Genesis

*   Spaces are created on an Agent's Device.
*   On creation, a temporary key pair is generated and used to sign a set of `Genesis` messages.
*   The Genesis messages include access control and Device authorization for the originating Agent.
*   After Genesis, the private key is destroyed.
*   The public key (or hash) may be used as a discovery key to advertise or locate a Space on the peer-to-peer MESH network.

#### 4.3.3. Agent Authorization

*   Spaces contain a DAG of `Agent Auth` messages that determine the capabilities of any ***Device*** controlled by the specified Agent.
*   These messages are written to control feeds by a previously authorized Device and contain the public identity key of the given Agent.
*   The authorization process may be initiated by sending an invitation token to the invitee.
    *   The token contains the Space's discovery key, which is used to connect the inviter and joining Devices via the MESH network.
    *   This initiates a handshake where joining Agent's Identity public key is sent to the inviting Device.
    *   If the invited Agent's Identity key is already know to the inviter (e.g., via the Agent's Circle), then the `Agent Auth` message can be written "offline", allowing the joining Device to authenticate at a later time.

#### 4.3.4. Device Authentication

*   On joining a Space, the Device presents a Credential containing a claim that it is authorized to act on behalf of a given Agent.
*   This Credential must be signed using either the Agent's Identity private key, or an authorized Device's private key.
*   The verifying Device requires a chain-of-trust that demonstrates that the joining device belongs to the Agent.
    *   The joining Device may, therefore, present a set of Credentials (from its corresponding HALO) that demonstrate transitive authorization (e.g., Agent A authorizes Device 1, which was used to authorize Device 2).
    *   On successful authorization the verifying Device writes a `Feed Admit` message to its control feed similar to the HALO Device authorization process above.
*   **NOTE**: After the inviting Device has written the `Agent Auth` message, ANY Device belonging to ANY previously authorizated Agent (with invitation permissions) may complete the authentication and `Feed Admit` process.

The diagram below illustrates the chain of trust formed when a Space is constructed and the Agent authorizes and authenticates a second device, then invites a second Agent to the Space.

![Credentials](./diagrams//halo-credentials-space.drawio.svg)

### 4.4. Design Issues

*   TODO: DXNS
    *   hybrid/federated KUBE p2p/blockchain.
    *   maintains a map of name (DXN) => Document (typed record) with a set of Credentials (that contains a set of public keys that have Issuer over the document).
    *   DNS resolver? Subnets?
    *   DID controller?
*   TODO: Use blockchain hash as timestamp for revocation messages. Finality?
*   TODO: Peer DID resolution?
*   TODO: Optionally publish Github credential (claim) to HALO as backup-recovery?
*   TODO: Consider integration with hardware wallets?

## 5. Implementation Details

> *   TODO(burdon): Add UML and state machine diagram.

### 5.1. Credential message

A Credential message consists of:

*   Signed part:
    *   Timestamp of credential creation.
    *   Nonce as a randomly generated by string. \[Allow different signatures to have different nonces, allowing for more efficient presentation]
    *   Dynamically typed payload encoded via `google.protobuf.Any`.
*   List of signatures, each having:
    *   The signing public key.
    *   The signature itself.
    *   Optional KeyChain.

Ed25519 curve is used for signatures via [hypercore-crypto](https://www.npmjs.com/package/hypercore-crypto) package.

### 5.2. Keychain

> See packages/common/protocols/src/proto/dxos/halo/keys.proto

A set of credential messages that establishes a chain of trust between the signing key and the trusted keys.
Allows for delegation of Issuer.

KeyChain is stored in a tree-like data structure.
Each entry consists of:

*   Public key being described.
*   A signed credential message where the public key is the subject of the credential.
*   Zero or more parent KeyChains establishing the trust of the keys that signed the credential.

Example:

Spaces admit identity keys as members. When a Device signs a credential, it produces a signature using it's own Device key and attaches a KeyChain containing a KeyAdmit message, admitting the Device key to the HALO.

> Q: What's the difference between including KeyChain as a parent of a different KeyChain vs having the credential message of that KeyChain entry be signed with the first KeyChain.

> TODO: It seems only the signatures of credential messages are verified and the claims are ignored.

### 5.3. Space (space) state machines

*   Each space comes with a set of control feeds that can store credential message.
*   Some types of credentials are processed by the space internally:
    *   spaceMember - updates the list of space members (IDENTITY keys) and sets permissions.
    *   AdmittedFeed - space will maintain a set of associated feeds.
*   All credentials that are processed by the space must either be issued by the Space genesis key or by one of the member identities with proper permissions.
*   Other credentials are ignored by the space, but are preserved and can be queried for. For example devices would query HALO space to build the device KeyChain.

### 5.4. HALO Creation

> *   TODO(burdon): Reconcile with above.

1.  Generate identity key-pair.
2.  Generate Device key-pair.
3.  Generate feed key-pair.
4.  Write HALO SpaceGenesis credential:
    *   Establishes the genesis of the HALO Space.
    *   Admits the Device key.
    *   Admits the feed.
    *   Identity key is used as the HALO Space key so it is automatically admitted. \[use hash of identity key as Space key?, key rotation?]
    *   Signed by: identity key, Device key, feed key. \[why?]
5.  Write IdentityGenesis (KeyAdmit) message.
    *   Admits identity key.
    *   Signed by: identity key.
6.  Write IdentityInfo message
    *   Contains the identity display name string.
    *   Skipped if there's no display name for this identity.
    *   Signed by: identity key. \[sign by Device key instead?]
7.  Write DeviceInfo message
    *   Contains the Device display name string.
    *   Skipped if there's no display name for this Device.
    *   Signed by: Device key.
8.  Create initial set of metadata items in HALO Space database.
9.  Destroy the secret key of identity key.

> TODO: Device key chain is formed after the HALO is created. Explain the process.

> Genesis feed

### 5.5. ECHO Space creation

> *   TODO(burdon): Reconcile with above.

1.  Generate Space key-pair.
2.  Generate feed key-pair.
3.  Write SpaceGenesis credential message
    *   Admits the feed key.
    *   Admits the Space key.
    *   Signed by: Space key, feed key.
    *   \[With genesis feed Space-key=feed-key so we wouldn't have to admit them]
4.  Wrap and write the IdentityGenesis message.
    *   Copied from HALO Space.
    *   Additionally signed by the Space key.
    *   \[is the original service (i.e., HALO Space) of the IdentityGenesis message important?]
5.  Write FeedAdmit message
    *   Admits the feed key.
    *   Signed by the Device key-chain.
6.  Copy the IdentityInfo message from the HALO Space.
    *   May be skipped if doesn't exist.
    *   Additionally signed by Device key-chain.
7.  Create Space metadata item in the database.
8.  Destroy the secret key for the Space key.

> *   TODO: Difference between KeyAdmit and FeedAdmit messages.
> *   TODO: Separate feed keys into their own domain, disallow feed keys to sign credentials.

## 6. Security Concerns

> *   TODO: Privacy, Trust Models, and Threats
> *   TODO(pierre): Privacy review (for Spaces and Peer signaling).
> *   ISSUE: A time-salted hash of the associated Public key may be used to discover the Space (i.e., MESH discovery key).
> *   This hash may be transmitted publicly (e.g., as a discovery key for signaling) and provides one degree of privacy.

### 6.1. Aspects of Trust

| Aspect                 | Description                                                    |
| ---------------------- | -------------------------------------------------------------- |
| Availability           | Can the information be found from any node within the network? |
| Correctness            | Is the information tamper-resistent and verifiable?            |
| Consensus and Finality | Can agreement across all peers be determined (and when)?       |
| Privacy                | Can the information be seen by others on a public network?     |
| Censorship Resistance  | Is all current information visible?                            |

> *   TODO: Find another reference for this?

### 6.2. Trust Models

| System | Description                                                            |
| ------ | ---------------------------------------------------------------------- |
| KUBE   | Trusted server controlled by authenticated and authorized Agent.       |
| ECHO   | Trustless peer-to-peer network controlled by HALO.                     |
| MESH   | Trusted subnet or decentralized network (e.g., DXOS).                  |
| IPFS   | Trusted subnet of blockchain controlled network (e.g., Filecoin, DXOS) |
| DXNS   | Trusted subnet or decentralized network (e.g., DXOS).                  |
| DNS    | Trusted subnet or global network controlled by root servers.           |

> *   TODO: Document trust model and threats.

### 6.3. compression

Since credentials will often be issued via delegated authority, e.g. with device KeyChains, they might include repeating credentials.
To compress the data on the feeds, writers might replace full credentials with references by their CID, as long as they appear in the feeds messages included by the timeframe.

> *   TODO: Define semantics of what credentials are indexed. Credentials from chains are also indexed.

### 6.4. Invitations

This spec does not define protocols to invite new Agents/Devices to a space.
The concrete invitation processes will be implemented on a higher level, possibly within the app.
They can still use the Space facilities such as credential storage and networking.

Space membership is defined by the spaceMember credential. All protocols must eventually write a spaceMember credential to finialize the process.

Examples of possible invitation processes:

*   Direct admission by key.
*   Invitation process with redeeming: a temporary credential (possibly with expiration is written to the space). An invitation token is sent to the invitee via a side channel (e.g. email). Invitee can claim an invitation later on.
*   Interactive real-time invitation: Inviter and invitee will connect directly over the network to perform the invitation process.

## 7. References

1.  [Decentralized Identifiers (DIDs)](https://www.w3.org/TR/did-core)
2.  [Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model)
3.  [Peer DID Method Specification](https://identity.foundation/peer-did-method-spec)
4.  [Compare and Contrast — Federated Identity vs Self-sovereign Identity](https://academy.affinidi.com/compare-and-contrast-federated-identity-vs-self-sovereign-identity-227a85cbab18)
5.  [Peer DIDs - What Can You Do With It?](https://academy.affinidi.com/peer-dids-an-off-ledger-did-implementation-5cb6ee6eb168)
6.  [Keybase](https://book.keybase.io/docs)

## 8. Appendix

The protocol protocol buffer schema are defined [here](./refs/credentials.proto).

### 8.1. Protocol Schema

<!-- @code(../../packages/halo/halo-protocol/src/proto/defs/credentials.proto, link) -->

<sub>`@dxos/halo-protocol`[`[src/proto/defs/credentials.proto]`](../../packages/halo/halo-protocol/src/proto/defs/credentials.proto)</sub>

```protobuf
//
// Copyright 2022 DXOS.org
//

syntax = "proto3";

package dxos.halo.credentials;

import "google/protobuf/timestamp.proto";
import "@dxos/protocols/src/proto/dxos/halo/keys.proto";

//
// TODO(burdon): Move these notes to the design doc commentary.
// Peers maintain Feeds that are admitted to HALO and ECHO Spaces.
// Peers act as Verifiers for Credentials that may be Presented from other Peers.
// Since Feeds implement a signed hash-linked data structure, they constitute a chain-of-authority for chained Credentials.
// Credentials written to HALO Feeds may be Presented to Peers Verifying ECHO Spaces.
//

//
// **spaceGenesis** -
//  First message written to initial Feed in a new space.
//

message spaceGenesis {
  PubKey space_key = 1; // Feeds belong to Spaces.
}

//
// **Claim** -
//  Statement about a subject.
//  Claims can be written directly to a feed or used within Credentials.
//

// Agent is authorized to access space.
message spaceMember {
  // TODO(burdon): Consider permissions (e.g., for Bots).
  enum Role {
    INVALID = 0;
    /// Manage members.
    ADMIN = 1;
    /// Read and write.
    MEMBER = 2;
    /// Read-only.
    READER = 3;
  }

  PubKey space_key = 1;
  Role role = 2;
}

// Device is authorized to sign messages for a given Agent (Identity).
// NOTE: Devices are Admitted to Identities.
message AuthorizedDevice {
  PubKey identity_key = 1;
  PubKey device_key = 2; // Existing authorized device.
}

// Feed is admitted to the space for replication.
// NOTE: Feeds are Admitted to Spaces.
message AdmittedFeed {
  enum Designation {
    /// Classic general purpose feeds for both HALO and ECHO messages together. To be deprecated.
    GENERAL = 0;
    /// Contain system-level messages messages, such as credentials and epochs.
    CONTROL = 1;
    /// Database mutations.
    DATA = 2;
  }

  PubKey space_key = 1;

  /// Owning identity.
  PubKey identity_key = 2; // Could be derived.
  /// Owning device.
  PubKey device_key = 3;

  /// Controls sets the feed designation. Feeds with different designations are consumed by separate pipelines.
  Designation designation = 4;
}

/// Associtaes a space that will implement Agent's HALO with an Identity.
message HaloSpace {
  PubKey identity_key = 1;
  /// Space key.
  PubKey halo_key = 2;
}

/// Grants recovery permissions to a recovery key.
message IdentityRecovery {
  PubKey identity_key = 1;
  /// Public key derrived from the recovery seedphrase.
  PubKey recovery_key = 2;
}

/// Sets profile information.
message IdentityProfile {
  message ProfileDocument {
    optional string display_name = 1;
    optional string avatar_cid = 2;
  }

  // TODO(dmaretskyi): This could also be a DXNS link or stored in user's public HALO (we could also index the public HALO in the DMG).
  ProfileDocument profile = 1;
}

/// Metadata associated with a key.
/// Subject must be a key being referenced.
message KeyInfo {
  optional string name = 1;
}

//
// **Claim** -
//  Statement about a subject.
//  Claims can be written directly to a feed or used within Credentials.
//

message Claim {
  PubKey id = 1; // Subject of claim (e.g., Agent, Device, Feed).
  google.protobuf.Any assertion = 2;
}

//
// **Proof** -
//  Signature that makes Credential tamper-evident.
//  The proof is signed by the issuer of the Credential.
//  Ref: https://www.w3.org/TR/vc-data-model/#proofs-signatures
//

message Proof {
  string type = 1;              // Type of proof (e.g., "Ed25519Signature2020").
  Timestamp creation_date = 2;
  PubKey signer = 3;            // Entity that created the proof (e.g., Agent, Device, space).
  optional bytes nonce = 4;     // Used in Presentations to protect against replay attacks.

  /// Signature (excluded from signed data).
  bytes value = 5;

  /**
   * Must be present if signer is not credential issuer.
   * Establishes the authority of the signer. Proves that the signer can issue such credentials.
   * Excluded from signed data.
   */
  optional Chain chain = 6;
}

/**
 * A chain of credentials that establishes the delegated authority to issue new credentials.
 * Each key in the chain has an assotiated credential that establishes the authrity of that specific key.
 *
 * Example:
 *   Alice/Device-2 => Alice/Device-1 => Alice
 *
 * This chain would include 2 credentials:
 *   1. Giving Alice/Device-2 the authority to issue credentials on behalf of Alice, signed by Alice/Device-1.
 *   2. Giving Alice/Device-1 the authority to issue credentials on behalf of Alice, signed by Alice.
 */
message Chain {
  /// Credential that authorizes the subject to issue new credentials (can be recursive).
  Credential credential = 1;
}

//
// **Credential** -
//  Set of claims containing a proof signed by the issuer.
//  Credentials may be stored in a Credential Repository (e.g., digital wallet.)
//  Credentials may also be store within feeds (e.g., an agent's HALO).
//

message Credential {
  optional PubKey id = 1;                 // Credential identifier (e.g., for storage indexing).
  PubKey issuer = 2;                      // key = { space (genesis) | Identity (genesis) | (authorized) Device }
  Timestamp issuance_date = 3;
  optional Timestamp expiration_date = 4;
  optional bytes expiration_ref = 5;       // Could reference blockchain or epoch number.
  Claim subject = 10;
  Proof proof = 11;
}

//
// **Presentation** -
//  Signed Credential(s) sent to a Verifier.
//  Presentations are typically NOT stored any may include a challenge (e.g., nonce).
//  Presentations may contain multiple Credentials (and require multiple proofs).
//

message Presentation {
  repeated Credential credentials = 1;
  repeated Proof proofs = 2;
}

//
// **Metadata** -
//   Persistant metadata stored outside of used to bootsrapt the stack.
//

/// Information needed to bootstrap a Space.
message SpaceRecord {
  PubKey space_key = 1;

  /// All feeds in the space must form a DAG (or a tree?). This is the root feed of that structure.
  PubKey genesisFeedKey = 2;
}

/// Information needed to bootstrap an Identity.
message IdentityRecord {
  PubKey identity_key = 1;

  SpaceRecord halo_space = 2;

  /// Public profile information.
  /// Not yet implemented. Must be null.
  optional SpaceRecord profile_space = 3;

  /// Cached profile.
  optional IdentityProfile.ProfileDocument profile = 4;
}
```

### 8.2. Example

<!-- @code(./refs/example.yml, { validate: true }) -->

```yaml
#
# Copyright 2022 DXOS.org
#

#
# space Genesis: Creating a new space.
#

feed:
  key: Alice/Device-1/Feed-1
  messages:
    - id: 1
      data:
        # Self-signed Credential by the space.
        @type: dxos.halo.space.spaceGenesis
        space_key: Alice-Halo # ISSUE: Different from IdentityKey?
        identity_key: Alice
    - id: 2
      data:
        # Authorizes device to sign on behalf of Identity
        # NOTE: This Credential SHOULD be Presented on joining a space.
        @type: halo.credential.Credential
        issuer: Alice # Self-signed.
        subject:
          id: Alice/Device-1
          assertion:
            @type: halo.credentials.AuthorizedDevice
            identity_key: Alice
    - id: 3
      data:
        # Admits the feed to the feed graph.
        @type halo.credential.Credential
        issuer: Alice/Device-1
        subject:
          id: Alice/Device-1/Feed-1
          assertion:
            @type halo.credentials.AdmittedFeed
            space_key: Alice-Halo
            device_key: Alice/Device-1

#
# Device Admission: Adding a new Device to a HALO.
# NOTE: This is the same as the initial Device Admission above, but with a different Issuer.
#

feed:
  key: Alice/Device-1/Feed-1
  messages:
    - id: 100
      data:
        @type halo.credential.Credential
        issuer: Alice/Device-1
        subject:
          id: Alice/Device-2
          assertion:
            @type halo.credentials.AuthorizedDevice
            identity_key: Alice
    - id: 101
      data:
        # NOTE: This MUST have been Presented from an authorized Device.
        @type halo.credential.Credential
        issuer: Alice/Device-2
        subject:
          id: Alice/Device-2/Feed-2 # New Feed.
          assertion:
            @type halo.credentials.AdmittedFeed
            space_key: Alice-Halo
            device_key: Alice/Device-2

#
# ECHO Genesis: Creating a new Space.
#

feed:
  key: Alice/Device-1/Feed-3
  messages:
    - id: 1
      data:
        # Self-signed Credential by the space.
        @type halo.space.Genesis # NOTE: Same as HALO.
        space_key: space-1
        identity_key: Alice
    - id: 2
      data:
        # Authorizes Agent.
        @type halo.credential.Credential
        issuer: Alice # Self-signed.
        subject:
          id: Alice
          assertion:
            @type halo.credentials.spaceMember
            space_key: space-1
            role: ADMIN

#
# Feed Admission: Device admits a new feed.
# NOTE: This happens as part of Genesis, but is exactly the same mechanism as any
#   Authorized Agent presenting a nested Feed Admission Credential.
# Any authorized Peer can Verify a Feed Admin Presentation.
#   ISSUE: How to detect and avoid multiple Peers from doing this concurrently? (e.g., Direct P2P Requests?)
#

feed:
  key: Alice/Device-2/Feed-3
    - id: 3
      data:
        @type: halo.credential.Credential
        issuer: Alice
        subject:
          id: Alice/Device-2/Feed-3 # NOTE: This Feed.
          assertion:
            @type: halo.credentials.AdmittedFeed
            space_key: space-1
            identity_key: Alice
            device_key: Alice/Device-1
        proofs:
          - type: 'ECDSASignature'
            value: 0x1ba37..3125ab
            signer: Alice/Device-2
            # Mapping from the signing key to the credential that establishes it's authority 
            chain:
              Alice/Device-2:
                @type: halo.credential.Credential
                issuer: Alice/Device-1
                subject:
                  id: Alice/Device-2
                  assertion:
                    @type halo.credentials.AuthorizedDevice
                    identity_key: Alice
                proof:
                  - type: 'ECDSASignature'
                    value: eyJhbGci...yHUdBBPM
              Alice/Device-1:
                issuer: Alice
                  subject:
                    id: Alice/Device-1
                    assertion:
                      @type halo.credentials.AuthorizedDevice
                      identity_key: Alice
                  proof:
                    - type: 'ECDSASignature'
                      value: eyJhbGci...yHUdBBPM

#
# Member Admission: Adding a new Member to a Space.
# The joining Agent will Present a Credential representing a Feed Admission.
#

feed:
  key: Alice/Device-1/Feed-3
  messages:
    - id: 100
      data:
        @type halo.credential.Credential
        issuer: Alice/Device-1
        subject:
          id: Bob
          assertion:
            @type halo.credentials.spaceMember
            space_key: space-1
            role: WRITER
```


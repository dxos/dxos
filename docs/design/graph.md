# DMG

This document outlines the DXOS Decentralized Meta Graph (DMG).

## 1. Introduction



### 1.1 Motivation

- Our professional and social networks are one of our most valuable assets.
- Social networks suck; they don't serve us.
- We need fundamental internet-scale protocols to build more advanced applicaitons and systems.
- HALO and ECHO define low-level protocols that represent identity and information;
  MESH and KUBE provide the building blocks to support such systems.


## 2. Basic Concepts

The DMG is made up of Circles (decentralized identity) and Branes (decentralized information).


### 2.1 Identity: Circles, Groups, and Agents

Participants within the DMG (both humans and autonomous systems) are called ***Agents***,
which control their own [self-sovereign identity](https://academy.affinidi.com/compare-and-contrast-federated-identity-vs-self-sovereign-identity-227a85cbab18) (SSI).
Agents identify themselves using [Peer DIDs](https://www.w3.org/TR/vc-data-model),
which can be resolved by the network to [DID Documents](https://www.w3.org/TR/did-core/#dfn-did-documents) that contain metadata (including public keys) associated with the agent.

An exmaple of a Peer DID: `did:peer:1zdksdnrjq0ru092sdfsd491cxvs03e0`.

Agents maintain a HALO, which is a secure decentralized keychain that contains [Verifiable Credentials](https://www.w3.org/TR/vc-data-model) that represent various forms of ***Claims***.
Claims may represent access rights, digital asset ownership, relationships, and other information that can be digitally verified without the need for a centralized authority.

The HALO also contains an address book of other agents (represented by Peer DIDs) along with metadata that may represent relationships and claims associated with these agents. For example, one agent may issue a verifiable credential representing a friendship, which may enable the other agent to freely exchange messages or request information.

The set of all contacts for a given agent is called a ***Circle***.

The system also enables the creation of ***Groups***, which are ad hoc collections of agent identifiers (Peer DIDs) and claims (Verifiable Credentials) that may represent rights associated with these agents.
Groups are also referenced by Peer DIDs; the corresponding DID Document may be used to verify the management rights to the group.
Groups may be used to implement access control for decentralized digital assets.

#### References

- [Decentralized Identifiers (DIDs)](https://www.w3.org/TR/did-core)
- [Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model)
- [Peer DID Method Specification](https://identity.foundation/peer-did-method-spec)
- [Compare and Contrast — Federated Identity vs Self-sovereign Identity](https://academy.affinidi.com/compare-and-contrast-federated-identity-vs-self-sovereign-identity-227a85cbab18)
- [Peer DIDs - What Can You Do With It?](https://academy.affinidi.com/peer-dids-an-off-ledger-did-implementation-5cb6ee6eb168)



### 2.2. Information: Branes, Spaces, and Atoms









#### References

- [IPLD](https://ipld.io/docs)



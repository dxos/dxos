# An Introduction to DXOS <!-- omit in toc -->

<!-- @toc -->

- [1. Introduction](#1-introduction)
- [2. Ontology](#2-ontology)
  - [2.1. HALO](#21-halo)
    - [2.1.1. Profiles](#211-profiles)
    - [2.1.2. Devices](#212-devices)
    - [2.1.3. Circles](#213-circles)
  - [2.2. ECHO](#22-echo)
    - [2.2.1. Spaces](#221-spaces)
    - [2.2.2. Branes](#222-branes)
    - [2.2.3. Frames](#223-frames)

## 1. Introduction

DXOS is a collection of multiple decentralized systems that encompass Users, Agents, Databases, and Services.

## 2. Ontology

This section outlines the core concepts of the DXOS system.

### 2.1. HALO

*   HALO protocols and components relate to identity, privacy, security, and collaboration.
*   The HALO application is a software wallet that contains secrets (i.e., private keys) and credentials (e.g., decentralized credentials that may be used to access network services).

#### 2.1.1. Profiles

*   Users can create an unlimited number of self-sovereign identities.
*   Identities are controlled by public-private key pairs.
*   References may be shared via DIDs that contain public keys used to verify signatures.
    The DXOS blockchain implements a DID resolver.
*   Identities are not connected to each other in any way.
*   Agents include both human Users and long-lived autonomous systems, which may be sovereign, or controlled by (belong to) Users.

#### 2.1.2. Devices

*   Users maintain a set of devices that are associated with a Profile.
*   Devices include browsers, mobile apps, and remote network Agents.
*   Devices may be de-activated.
*   Devices store securely both HALO and ECHO data.

#### 2.1.3. Circles

*   Users maintain a set of contacts that are collectively known as a Circle.
*   Contacts are associated with another User's Profile DID and metadata (e.g., display name, avatar, etc.)

### 2.2. ECHO

*   ECHO protocols and components relate to data.

#### 2.2.1. Spaces

*   A Space is a decentralized collection of data identified by a public key.
*   Spaces may contain structured data that is kept consistent via unique ECHO data consensus protocols.
*   Spaces be accessed by multiple Users and Agents.
*   Spaces may be public or private.
*   Spaces may contain atomic data records called Items.
*   Items may be self-describing via the DXOS decentralized type system.
*   Items may reference other Items within the Space or contained within other Spaces.

#### 2.2.2. Branes

*   The collection of all Spaces accessible by a User is known as a Brane.

#### 2.2.3. Frames

*   Frames are application components that implement user interfaces that are able to display and manipulate data within a Space or across a User's Brane.
*   Frames may be dynamically discoverable (and loaded or activated) by querying decentralized registries.
*   Frames may declare bindings that are associated with the DXOS decentralized type system.


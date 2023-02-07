---
title: Glossary
order: 100
---

# Glossary

### ECHO

Eventually Consistent Hierarchical Object Store supporting multiple concurrent writers and latent offline writers

### HALO

A protocol, application, and SDK for managing a decentralized user identity for end users and developers

### MESH

The set of peer networking technologies behind ECHO, HALO and KUBE

### KUBE

A reslilient, self-contained set of services for hosting and supporting decentralized applications

### Space

An ECHO replication domain containing objects which all the peers in the space replicate

### Object

A unit of data in a space, a bag of properties and values with a type and identity

### Signaling service

A service provided by DXOS KUBEs which helps peers locate each other on the network

### Invitation Code

A special generated code or URL containing one which is used for peers to identify each other when joining a space

### Authorization Code

A second factor provided to the invited member by the inviter to verify their identity when joining a space

### Space Key

A value identifying a particular space

### Identity

Represents an agent or actor in the system

### Vault

Data in ECHO and HALO identity is physically stored in browser storage on the HALO application's domain, not the consuming application's. Read more about [local vault topology](./echo/#local-vault-topology).

### Device

A running instance of the DXOS `Client` represents a device on the network. Every browser profile acts as a device. A CLI application is it's own device. HALO replicates identity and credential information across devices securely and automatically and supports device revocation.

### Seed Phrase
Also known as a paper key. A string of values that make it possible to recover an identity in case of a lost device.

### PWA
[Progressive Web App](https://en.wikipedia.org/wiki/Progressive_web_app)
# The DXOS Meta Graph <!-- omit in toc -->

<!-- @toc -->

*   [1. Introduction](#1-introduction)
*   [2. Basic Concepts](#2-basic-concepts)
    *   [2.1. Decentralized Identity (HALO)](#21-decentralized-identity-halo)
        *   [2.1.1. Self-Sovereign Identity](#211-self-sovereign-identity)
        *   [2.1.2. Social Networks](#212-social-networks)
    *   [2.2. Decentralized Data (ECHO)](#22-decentralized-data-echo)
    *   [2.3. Decentralized Services (KUBE + MESH)](#23-decentralized-services-kube--mesh)
    *   [2.4. Decentralized Naming Service (DXNS)](#24-decentralized-naming-service-dxns)
*   [3. Reference](#3-reference)
*   [4. Notes](#4-notes)

## 1. Introduction

The DMG is a decentralized social network.
It consists of multiple interconnected decentralized networks:

1.  `HALO`: Identity and social networks
2.  `ECHO`: Realtime data
3.  `MESH`: Peer-to-peer networks
4.  `KUBE`: Peer-to-peer services
5.  `DXNS`: Discovery and naming service

> *   TDOO: Explain in more detail.

## 2. Basic Concepts

To get started install the `dx` shell command.

```bash
npm i -g @dxos/dx
```

To install the OS/X desktop app and menubar, install the native application.

```bash
brew install dx
```

> *   TODO: dx is still available.

### 2.1. Decentralized Identity (HALO)

#### 2.1.1. Self-Sovereign Identity

Create your identity.

```bash
> dx halo init --username Alice
Record your recovery seed phrase:
[ circle wool lesson trick sail ... ]

> dx whoami
Alice

> ls -las ~/.dx
id_dxos
id_dxos.pub
```

> *   TODO: Password to encrypt local HALO.

#### 2.1.2. Social Networks

Create a URL containing a one-time use invitation token.

```bash
> dx halo invite --ttl 3600
https://example.com/halo/Qmbq6Su7LzgYYgfQBzJUdXjgDUZZKxt4NSs4tbYwvfH8Wd
```

The URL uses the hostname of a KUBE node connected to the MESH network.
The token expires after a given TTL period.

Alternativerly, create a QR code and send this to your friend.

```bash
> dx halo invite --qrcode
Created: ~/dxos-qr.png
```

> *   TODO: Link contains token but also link to download client.

Connect to the MESH network and ACK the incoming friend requests.

> *   TODO: Interactive vs. non-interactive mode?

```bash
> dx mesh connect
$ 808 KUBE nodes.
$ ACK friend request from Bob? [y/n]
$ Enter token: 1234
```

List friends stored in your HALO address book.

```bash
> dx halo contacts
$ Bob
```

> *   TODO: Keybase-like Mobile app, OSX menubar, browser extension, etc.
> *   TODO: DIDs

### 2.2. Decentralized Data (ECHO)

Create a new ECHO space and create some data.

```bash
> dx echo space create --data '{ "title": "Things we should do." }'
> dx echo space list
QmPEKipMh6LsXzvtLxunSPP7ZsBM8y9xQ2SQQwBXy5UY6e *
Qmd286K6pohQcTKYqnS1YhWrCiS4gz7Xi34sdwMe9USZ7u

> The space is identified by an IPNS name.

> dx echo space select Qmd28
> dx echo space list
QmPEKipMh6LsXzvtLxunSPP7ZsBM8y9xQ2SQQwBXy5UY6e
Qmd286K6pohQcTKYqnS1YhWrCiS4gz7Xi34sdwMe9USZ7u *

> dx echo space append --data '{ "title": "Join the circus" }'
> dx echo space append --data '{ "title": "Remember the milk!" }'
```

List the contents of the space.

```bash
> dx echo space list --json
{
  "key": "Qmd286K6pohQcTKYqnS1YhWrCiS4gz7Xi34sdwMe9USZ7u",
  "items": [
    {
      "id": "CFBB9E61-FF74-4ABE-8DA3-668473BF5E9E",
      "data": {
        "title": "Join the circus"
      }
    },
    {
      "id": "326313F9-70ED-4191-B9B2-1593ECF223B2",
      "data": {
        "title": "Remember the milk!"
      }
    },
  ]
}
```

> The `dx echo` command remembers the context of the most recently accessed space.

Invite your friend to the space.

```bash
> dx halo lookup Bob
QmW2WQi7j6c7UgJTarActp7tDNikE4B2qXtFCfLPdsgaTQ

> dx echo invite --user QmW2WQi7j6c7UgJTarActp7tDNikE4B2qXtFCfLPdsgaTQ
```

Get the access list of the space.

```bash
> dx echo members
Alice
Bob
```

Create a read-only feed for the space.

```bash
> dx echo feed
https://example.com/echo/Qmd286K6pohQcTKYqnS1YhWrCiS4gz7Xi34sdwMe9USZ7u
```

> *   TODO: ECHO streams/feeds; KUBE servers support WebSub.
> *   TODO: IPLD graph: ECHO + IPFS.
> *   TODO: Messaging.

### 2.3. Decentralized Services (KUBE + MESH)

Install and start a KUBE daemon.

```bash
> brew install kube
> kube start
```

Ping the daemon.

```bash
> curl localhost:3967/status | jq
{
  "key": "Qmbq6Su7LzgYYgfQBzJUdXjgDUZZKxt4NSs4tbYwvfH8Wd"
}
```

> *   TODO: Detect part of MESH network.
> *   TODO: List services .well-known.

### 2.4. Decentralized Naming Service (DXNS)

```bash
> dx ns list
```

> *   TODO: Discovery.
> *   TODO: Security concerns?

## 3. Reference

*   [FOAF](https://en.wikipedia.org/wiki/FOAF_\(ontology\))
*   [Keybase](https://keybase.io)
*   [Diaspora](https://diasporafoundation.org/)
*   [WebSub](https://www.w3.org/TR/websub)
*   [IPLD](https://ipld.io)
*   [Decentralized Identifiers](https://www.w3.org/TR/did-core)
*   [Verifiable Credentials](https://www.w3.org/TR/vc-data-model)
*   [Semantic Web](https://www.w3.org/standards/semanticweb)
*   [Solid](https://solidproject.org)

## 4. Notes

#### 4.1. 2022-07-13

*   HALO encrypted local storage
*   DXNS API/abstraction (e.g., signal network discovery)
*   Domain specific credentials (e.g., friends)
*   ephemeral messaging between friends (chat, invitations)


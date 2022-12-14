---
order: 1
title: "Why DXOS?"
prev: README.md
next: quick-start
---

## Mission

Our mission is to create a fully decentralized alternative to the existing Cloud, that enables independent software developers to create scalable privacy preserving applications.

## Vision

Born out of a need for knowledge sharing, the internet evolved into a handful of large, centralized applications that trade our privacy for the superpowers they provide.
We can access all of humanity's wisdom, but we give up our identity to advertisers.
We can connect with anyone around the world, but we can be "de-platformed" at any time.
Our most valuable records, our favorite collections of content, our identity and life's work can evaporate at any time. We don't own or control the data we create when we use modern applications.

Centralization is a natural and valuable part of the evolution.
It's easier to reason about scaling and securing an application designed around a central server.
The internet isn't wrong for being centralized, it's been designed for scale and reliability, and it works well.

Our most valuable applications are typically built by for-profit concerns.
This leads to silos and moats around our information, causes engineering teams to implement the same fundamental things in every app, and duplicates much of the user's metadata across the apps they use.
We've had to accept that copies of our information will be stored by all kinds of 3rd parties, and we will never be able to do anything about that.

What if our software was built without the silos and moats around individual applications?
Imagine being able to turn phrases from a chat with someone into a requirements document without copy pasting, switching windows, or "fixing formatting".
Imagine no distance between those requirements and the code of the software that gets built to support them.
It should all appear as connected knowledge in a single view.

How much easier would it be if there was one place to go to locate everything you were working on in relation to a given person, project, or company?
What if all software universally supported the undo/redo functionality, "for free", at no cost to app developers?
What if all software universally worked offline and allowed real-time collaboration by default as well? What if your data never had to leave your device?

What would have to be true for such a world to exist?

*   we need software to work **offline first**
*   We need **decentralized technologies** for peer discovery, consensus, service availability, and user identity problems.
*   We also need to solve continuous integration, code management, and **software trust** for decentralized software.
*   We need a platform built around **privacy by default** without precluding public discord and reputation
*   We need a platform and community that enables **developers to share schema**, code and infrastructure, and interoperate without repeating the same wheels in every application
*   We need a **workable revenue model** that supports the infrastructure and developers that make up this platform
*   There must be **an order of mangnitude of productivity gains** for developers when compared to building "siloed" applications, to "pay" for their switch.
*   This efficiency will come from schema interoperability, and the consequentially deeper re-use of community code.

## Technologies

DXOS supports the development and operation of privacy preserving, internet-scale applications.

### [ECHO](echo)

In order to build local-first and offline-first applications with peer-to-peer collaboration features, developers need a solution for state management with key attributes enabling offline-first and real-time collaboration. [Read more](echo)

### [HALO](halo)

Most applications need to understand, store, and protect the identity of the user using them. Users don't want to memorize new passwords for every application, and developers don't want to implement the hard parts of secure authentication. [Read more](halo)

### [MESH](mesh)

Legacy network topologies were designed for the world of client-server. NATs and firewalls make it harder for peers to locate each other. [Read more](mesh)

### [KUBE](kube)

Cloud providers have created too much gravity and complexity around the primitives of hosting code and running servers. You shouldn't have to understand and code against a complex cloud provider just to deploy and host a typical offline-first application. [Read more](kube)

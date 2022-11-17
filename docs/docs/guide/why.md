---
order: 1
title: "Why DXOS?"
prev: README.md
next: quick-start
---
# Motivation

The internet is our most valuable resource. Born out of a need to share knowledge, it evolved into a handful of large, centralized applications that trade our privacy for the superpowers they provide. We can access all of humanity's wisdom within a few keystrokes, but we have to give up our identity to advertisers. We can connect with others and spread the word at the speed of light, but we can be "de-platformed" at any time, without debate. Our favorite collections of things, our invaluable profiles can all be deleted at any time. We don't own or control the data we create when we use centralized applications.

Centralization is a natural and valuable phase of evolution for an application. It's easier to reason about scaling and securing an application designed around a central server. The internet isn't wrong for being centralized, it's designed for scale and reliability, and it works well.   

The internet was meant to help us build and grow humanity's knowledge together. Our ability to learn and combine each other's knowledge will determine the rate of our evolution. 

Centralized applications create walls and silos around information which slow this process down. Having narrow focus, and no interest in exposing interoperability to other software, siloed applications lead to yet more separate applications. Each application has to implement cloud hosting and storage operations, a user identity system, "a password reset form", and so on. Siloed applications each have to solve the same problems again and again. We've equally entrapped the user in the endless process of logging into, finding the right place within, and copying or pasting information between the plethora of windows and tabs.

What if our software was built without the silos and moats around individual applications? Imagine being able to turn phrases from a conversation into a requirements document without copy pasting, switching windows, or "fixing formatting". Imagine no distance between those requirements and the code of the software that gets built to support them. It should all appear as connected knowledge in a singular user experience. How much easier would it be if there was one place to go to locate everything you were working on in relation to a given person, project, or company? What if all software universally supported the undo/redo functionality, "for free", at no cost to app developers? What if all software universally worked offline and allowed real-time collaboration by default as well? What if your data never had to leave your device?

What would have to be true for such a world to exist?
- we need software to work offline first
- We need solutions to decentralize peer discovery, consensus, state synchronization, service availability, and user identity problems.
- We also need to solve continuous integration, code management, and software trust for decentralized software.
- We need a platform built around privacy by default without precluding public discord and reputation
- We need a platform and community that enables developers to share code and infrastructure, and interoperate without repeating the same wheels in every application
- We need a revenue model that supports the infrastructure and developers that make up this platform
- There must be orders of mangnitude of productivity gains for developers when compared to building "siloed" applications. This will come from the interoperability with other data, and re-use of platform and community code and infrastructure

::: tip The mission behind DXOS is to support the development and operation of privacy preserving, internet-scale applications.
:::

### [ECHO](echo)
In order to build local-first and offline-first applications with peer-to-peer collaboration features, developers need a solution for state management with key attributes enabling offline-first and real-time collaboration. [Read more](echo)

### [HALO](halo)
Most applications need to understand, store, and protect the identity of the user using them. Users don't want to memorize new passwords for every application, and developers don't want to implement the hard parts of secure authentication. [Read more](halo)

### [MESH](mesh)
Legacy network topologies were designed for the world of client-server. NATs and firewalls make it harder for peers to locate each other. [Read more](mesh)

### [KUBE](kube)
Cloud providers have created too much gravity and complexity around the primitives of hosting code and running servers. You shouldn't have to understand and code against a complex cloud provider just to deploy and host a typical offline-first application. [Read more](kube)
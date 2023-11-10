---
position: 2
label: DXOS Overview
---

# Overview

Here we will go through a high level overview of DXOS! This overview is intended to give you enough knowledge of the stack to complete the basic tutorial but that is it, links are provided below to more compreshensive resources on the stack.

TODO simplify the explanations so that any developer could understand the protocols

<!-- X is Y.
X does Z.
You will use X for W. -->

## MESH

The MESH protocol extends existing internet protocols to enable secure and resilient peer-to-peer networks. MESH enables the development of privacy-preserving applications that operate without centralized infrastructure. MESH is the underlying networking layer of DXOS and we will not need to interact with it directly in this tutorial.

TODO link to MESH docs

## HALO

The HALO protocol manages digital identity, collaboration, and access to applications, databases, and network devices. The HALO keychain works across devices and is seamlessly integrated into all DXOS applications. While identity may play a large role in some applications, in this tutorial we will simply use the profile provided by the framework.

TODO link to HALO docs

## ECHO

The ECHO protocol enables secure and scalable realtime databases that are used by applications and network services. ECHO incorporates unique data replication and consensus technologies that power realtime collaboration applications. ECHO is where your data is stored and the primary API we will be interacting with to build applications.

TODO link to ECHO docs

## DXNS

The Decentralized Naming Service (DXNS) is a permissionless blockchain that is used to coordinate and control the network. DXNS is a global registry for applications, services, network devices, and other platform assets. In this tutorial the DXNS registry will function like an app store where we will publish our work.

TODO link to DXNS docs

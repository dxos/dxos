# Client Spec <!-- omit in toc -->

<!-- @toc -->

- [1. Introduction](#1-introduction)
- [2. Specification](#2-specification)
  - [2.1. Identity and Device Management](#21-identity-and-device-management)
  - [2.2. Circles and Collaboration](#22-circles-and-collaboration)
  - [2.3. Branespace Exploration](#23-branespace-exploration)
- [3. Implementation](#3-implementation)
  - [3.1 Message Routing within the Browser](#31-message-routing-within-the-browser)
- [4. Reference](#4-reference)

## 1. Introduction

The DXOS Client is part of the core DXOS Typescript API.
It is the root class used to implement decentralized applications that run on the DXOS network.
These applications can run as Progressive Web Apps (PWA) in browsers and mobile devices, as native desktop apps, long running Web services, and command line interfaces (CLIs).


## 2. Specification

The basic app should implement the following features:

### 2.1. Identity and Device Management

*   Create a new HALO identity.
*   Recover an existing HALO identity.
    *   Using a seed phrase.
    *   Using a credential issued from another device.
*   Display and edit metadata relating to the user's profile.
*   Securely store the user's HALO using password protected encryption.
*   Securely uninstall the client erasing all local information.
*   Manage multiple client instances installed on other devices and platforms.
    *   Authenticate new clients.
    *   Revoke existing clients.
    *   View the set of existing clients.
    *   Initiate the installation of other platform clients:
        *   Terminal opens a PWA in the browser and initiates client authentication.
    *   Support multiple isolated instances in the CLI (e.g., via ENV variable).
    *   Support installation from a KUBE node (e.g., via a URL).

### 2.2. Circles and Collaboration

*   Provide a discovery key that can be presented to other users running the client.
*   Manage a set of contacts (user profiles).
*   Send and receive ephemeral messages to other users.
*   Publish profile to DXNS.
*   Manage HALO credentials and keychain.
    *   Store and use KUBE credentials to manage KUBE nodes.

### 2.3. Branespace Exploration

*   List Brane Spaces.
*   Query/navigate/visualize Space graph.


## 3. Implementation


### 3.1 Message Routing within the Browser

DXOS applications are peer-to-peer applications that synchronize state over a network swarm. 
The Client uses the WebRTC transport in order to stream data and achieve NAT traversal.

The application stack includes a replicated database that stores the user's identity (HALO) and data spaces (ECHO).
Applications share these resources, which must be kept consistent across concurrently running application instances.

In the browser, the main application stack runs within a long running [Shared Worker](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker),
while the application client and UX run within a browser tab.
In this manner, different applications running in multiple tabs share the same core stack and database.

Client instances running in the tab include a `ServiceProxy` that provides access to shared modules that are defined by protobuf service APIs (HALO, ECHO, etc.) The `ServiceProxy` communicates with a `ServiceHost` in the shared worker via [window messaging](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage).

Unfortunately, shared workers do not support WebRTC [^1].
As a consequence, the client stack running in the tab implements a WebRTC proxy that is used by a WebRTC router running in the shared worker.
This proxy/router mechanism implements the transport abstraction defined by the `NetworkManager`, which is used by services running in the shared worker.

![Browser architecture](./diagrams/client-webrtc-router.drawio.svg)

When multiple applications are running concurrently (in multiple tabs), the WebRTC router elects a proxy instance to be a gateway to a given swarm.
As tabs are opened and closed, the router may dynamically elect a new instance to become the gateway.

NOTE: The router may elect different tabs to provide WebRTC connectivity to different swarms at the same time (e.g., where swarms correspond to different ECHO Spaces.)


[^1]: [WebRTC in SharedWorker](https://hackmd.io/@gozala/S1d2O_ecU)


## 4. Reference

The following developer tools projects use the DXOS client.

*   [Kodama CLI](https://github.com/dxos/protocols/tree/main/packages/demos/kodama)
*   [HALO wallet browser extension](https://github.com/dxos/protocols/tree/main/packages/wallet/wallet-extension)
*   [Devtools browser extension](https://github.com/dxos/protocols/tree/main/packages/devtools/devtools-extension)
*   [DX CLI](https://github.com/dxos/cli)


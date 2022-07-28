# Client Spec <!-- omit in toc -->

<!-- @toc -->

- [1. Introduction](#1-introduction)
- [2. Specification](#2-specification)
  - [2.1. 1 - Identity and Device Management](#21-1---identity-and-device-management)
  - [2.2. 2 - Circles and Collaboration](#22-2---circles-and-collaboration)
  - [2.3. 3 - Branespace Exploration](#23-3---branespace-exploration)
- [3. Implementation](#3-implementation)
  - [3.1. Development](#31-development)

## 1. Introduction

The Kodama Client is a suite of univeral applications that implement the core DXOS functionality on multiple runtime platforms.
These include:

*   Web browser (PWA)
*   Native desktop
*   Mobile devices
*   OS Terminal

The client contains a core Javascript library that implements the DXOS protocols, and platform-form specific UX.

The client can be used stand-alone to access the user's HALO identity and credentials, sign transactions, and access the Branespace.
Extensions to the client may implement application specific functionality, for example: developer tools to build and manage applications;
administrative tools to set-up and manage the KUBE devices;
and any number of third-party user-facing applications.

## 2. Specification

The basic app should implement the following features:

### 2.1. 1 - Identity and Device Management

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

### 2.2. 2 - Circles and Collaboration

*   Provide a discovery key that can be presented to other users running the client.
*   Manage a set of contacts (user profiles).
*   Send and receive ephemeral messages to other users.
*   Publish profile to DXNS.
*   Manage HALO credentials and keychain.
    *   Store and use KUBE credentials to manage KUBE nodes.

### 2.3. 3 - Branespace Exploration

*   List Brane Spaces.
*   Query/navigate/visualize Space graph.

## 3. Implementation

### 3.1. Development

*   [Kodama CLI](https://github.com/dxos/protocols/tree/main/packages/demos/kodama)
*   [HALO wallet browser extension](https://github.com/dxos/protocols/tree/main/packages/wallet/wallet-extension)
*   [Devtools browser extension](https://github.com/dxos/protocols/tree/main/packages/devtools/devtools-extension)
*   [DX CLI](https://github.com/dxos/cli)


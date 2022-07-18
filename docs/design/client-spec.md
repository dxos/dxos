# Client Spec

> - TODO: Need codename for client application (e.g., "mono" (事) = "thing" Jp.)


## 1. Introduction

The Kodama Client is a suite of univeral applications that implement the core DXOS functionality on multiple runtime platforms.
These include:

- Web browser (PWA)
- Native desktop
- Mobile devices
- OS Terminal

The client contains a core Javascript library that implements the DXOS protocols, and platform-form specific UX.

The client can be used stand-alone to access the user's HALO identity and credentials, sign transactions, and access the Branespace.
Extensions to the client may implement application specific functionality, for example: developer tools to build and manage applications;
administrative tools to set-up and manage the KUBE devices;
and any number of third-party user-facing applications.


## 2. Specification

The basic app should implement the following features:

### Phase 1 - Identity and Device Management

- Create a new HALO identity.
- Recover an existing HALO identity.
  - Using a seed phrase.
  - Using a credential issued from another device.
- Display and edit metadata relating to the user's profile.
- Securely store the user's HALO using password protected encryption.
- Securely uninstall the client erasing all local information.
- Manage multiple client instances installed on other devices and platforms.
  - Authenticate new clients.
  - Revoke existing clients.
  - View the set of existing clients.
  - Initiate the installation of other platform clients:
    - Terminal opens a PWA in the browser and initiates client authentication.
  - Support multiple isolated instances in the CLI (e.g., via ENV variable).
  - Support installation from a KUBE node (e.g., via a URL).

### Phase 2 - Circles and Collaboration

- Provide a discovery key that can be presented to other users running the client.
- Manage a set of contacts (user profiles).
- Send and receive ephemeral messages to other users.
- Publish profile to DXNS.
- Manage HALO credentials and keychain.
  - Store and use KUBE credentials to manage KUBE nodes.

### Phase 3 - Branespace Exploration

- List Brane Spaces.
- Query/navigate/visualize Space graph.


## 3. Implementation

### Existing Development

- [Kodama CLI](https://github.com/dxos/protocols/tree/main/packages/demos/kodama)
- [HALO wallet browser extension](https://github.com/dxos/protocols/tree/main/packages/wallet/wallet-extension)
- [Devtools browser extension](https://github.com/dxos/protocols/tree/main/packages/devtools/devtools-extension) 

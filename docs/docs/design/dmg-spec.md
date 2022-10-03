# DMG Spec

<!-- @toc -->

*   [1. Terminology](#1-terminology)
*   [2. Concepts](#2-concepts)
    *   [2.1. DXN](#21-dxn)
    *   [2.2. Service](#22-service)
*   [3. Scenarios](#3-scenarios)
    *   [3.1. Properties](#31-properties)
    *   [3.2. Design](#32-design)

> *   TODO(burdon): Merge archived docs.

## 1. Terminology

**DMG Record** -
Typed document stored in the DMG.

**DMG Service** -
A server that supports queries and mutations against a local DMG instance. Resolved DXN URIs to DMG Records.

**DXN** -
A globally unique reference (URI) to a DMG Record.

**Subnet** -
A cluster of KUBE nodes under local authority.

## 2. Concepts

The Decentralized Meta Graph (DMG) is a global federated content-addressable graph database.
The database stores **DMG Records** which can be referenced by a **DXN** (URI) or content hash.
DMG Records can represent various things (e.g., applications, releases, KUBE nodes, services, etc.)

### 2.1. DXN

*   A DXN is a globally unique dot-delimitered URI.
*   The authority of a DXN is *anchored* by DNS (i.e., TLD, second-level domain, sub domain, etc.)
*   DNS records may reference a DMG Server which is an authority for DXNs "lower down". E.g., `com.alice` may resolves to a DMG Server running on a Alice's Subnet. She controls the DNS record.

**Examples**

    dx://org.dxos.type.app      # E.g., represents a protobuf schema definition.
    dx://com.alice.app.tasks    # E.g., represents a deployed app.

> *   ISSUE: Do registrars maintain a "flat" key-value store for domain names.
> *   ISSUE: Cert issues for nested sub-domains?

### 2.2. Service

*   KUBE nodes may run a DMG Service.
*   The DMG Service handles query and mutation requests that involve DMG Records.
*   A given DMG Service may handle OR dispatch query requests for the entire DMG. However, a DMG Service only has AUTHORITY for the domain that is registered with DNS. (e.g., the DMG Service at `alice.com` may respond with non-authoritative results for DXNs outside of the `com.alice` DXN namespace.)

## 3. Scenarios

*   Bob loads app from a URL entered into a browser.
    *   How is the app served?
*   Alice deploys an app to her local developer workstation.
*   Alice deploys an app to a KUBE server on her local network (which may or may not have a publicly accessible endpoint).
*   Alice deploys an app to the permissionless DXOS network.
*   Alice publishes a document (e.g., type schema) to the DMG.
*   Alice configured here DMG Service to intercept DXN requests which redirect to different records while in development mode.
    E.g., she wants to have an "authoratative" record accessible to everyone via a given URI (e.g., `com.alice.type.contact`) but wants an "in-progress" document available to her apps while in development running within her subnet.
    E.g., while developing the Tasks app, she wants to override references to the `org.dxos.types.task` schema.

**Example**

Alice creates the Tasks app, which is devloped in a Github repo (`@alice/tasks`).
She publishes the app to a locally running KUBE node (`kube.local`) using the `dx` CLI.
The `dx.yml` file in the repo represents a DMG Record which is inserted into the graph.
DMG Records are published to a given DXN controlled by the user.

### 3.1. Properties

*   The Decentralized Meta Graph (DMG) is a global federated content-addressable graph database.
*   DMG is used by all KUBE services as a canonical metadata store.
*   DMG has both logical and physical partiions:
    *   Logical partitions are controlled by an authority (e.g., DXOS, Alice).
    *   Physical partitions are managed by one or more coordinated KUBE services.
*   Deployed apps make use of an App schema that defines the structure of a Record that is stored in the DMG. The schema record may be controlled by a different namesapce within the DMG.
    *   In the case of an Application record, this data may be contained within a `dx.yml` file checked into the source code repo.
    *   For example, the App Service is a client of the DMG Service. It can resolve DXNs to find an associated App record, which may contain IPFS hashes for files that should be served by an app server.
*   App server load-balancing/redirects.
*   DMG Records can be versioned/tagged.

### 3.2. Design

    Browser(URL) => [ DMG(URI) => DMG Record ] => File

> *   ISSUE: Users should NOT have to consider URLs when deciding on DXNs (i.e., how they organize their records).
> *   ISSUE: Record inheritance (tree).

Consider the following URLs:

    https://alice.com/tasks
    https://tasks.alice.com
    https://dxos.org/apps/tasks
    https://dxos.org/types/record.json
    https://alice.dxos.org
    https://tasks.alice.dxos.org
    https://beta.tasks.alice.dxos.org

*   The URL contains 2 things (e.g., `https://tasks.alice.com`).
    *   An enpoint to an App Service (e.g., `https://alice.com`).
    *   A Path or URL segment that locates the associated Record that defines the App (e.g., files, resources) (e.g., `tasks`).
    *   NOTE: The App Service is configured to use one or more DMG Services in order to resolve the URL/DXN.

```bash
curl https://tasks.alice.com
curl -H "Accept:application/json" https://kube.local/.well-known/dmg/com.alice.tasks

curl https://kube.local/.well-known/dmg?url=tasks.alice.com
curl https://kube.local/.well-known/dmg?dxn=com.alice.tasks
curl -H "Accept:application/json" https://tasks.alice.com 
```

    [URI] ---------------------------------------> [DMG Record]
      |                                                 ^
      v                                                 |
    [URL] -----> [DNS] -----> [App Service] -----> [DMG Service]


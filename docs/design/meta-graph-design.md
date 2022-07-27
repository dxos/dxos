# Meta Graph Design Document

This document presents the design of the Decentralized Meta Graph (DMG).


## Terminology

**Credential** - Verifiable credential that enables decentralized access control within the Subnet (e.g., administrative, read/write, replication, control).
  Each KUBE maintains a secure Credential store.

> - Conceptually part of HALO, but may be implemented via TLS.
> - TODO: Disambiguation TLS certificates from credentials (vs. CA/DNS).
> - TODO: Connect Pierre with Ben Laurie!

**DNS** - Global authority for domain records.

**KUBE** - Individual Host (Subnet Node) running the KUBE daemon.

> - TODO: Consider renaming but used `kube` until determined.

**Realm** - Logical partition of the federated DMG consistent across the Subnet.

**Root CA** - Root Certification (for the Subnet). Used to enroll KUBEs into the Subnet and is the root for other Credentials used within the Subnet.

**Subnet** - A cluster of KUBE nodes under local authority.


## Basic Concepts

- DMG is a decentralized federated graph. 
- It consists of locally controlled subnets that are made up of KUBE nodes.

![Meta Graph](./diagrams/meta-graph-subnet.drawio.svg)



### Realms

- Each KUBE Node creates a single local repo named `dmg` (`~/.kube/dmg.git`).
- Suppose we have a Subnet controlled by `alice` with three KUBE Nodes (`a1`, `a2`, `a3`).
  Each local repo has a `remote`, which references the other Nodes on the Subnet.
- All changes to the repo are replicated (pushed) to other Nodes.
- The Subnet maintains a locally consistent repo.


```
alice (alice.com) :: [a1, a2, a3]
    /alice/notepad
    /alice/tasklist
    /bob/notepad
        /pub

bob (bob.com) :: [b1]
    /bob/notepad
        /dev
        /pub


#####

Browser
    https://dxos.org/.well-known
                        /status
                        /ipfs/Qx28237982374982

    https://dxos.org/alice/notepad

                    => App Service running on the dxos.org cluster (resolved by DNS)
                        /alice/notepad 
                            => /refs/dxos.org/alice/notepad/prod => { dx.yml, index.html, indes.js }

    DXNS (runs on every Subnet)
        - Maps DXN path/name (embedded within URL and subdomain) to git ref; App server then retrieves and serves these files.
        - Allows publishing via either:
            - Blockchain based authority (which dxos.org runs, and rich.com also chooses to run) has on-chain map.
                - Trust based on account
            - Local (running on pcarrier.com) authority based on ssh keys and mapping within git.





- Map to realms?
- Map path to DNS?


On Alice's workstation

    /refs/heads/alice/notepad

Publishing to dxos.org

    1. Create DX account for DXNS (since dxos.org is running the DXNS service).
    2. Create authority `alice` by staking DX tokens (required by DXNS service).
    3. Publish 
        - create empty signed commit (aka release branch)
        - push commit to local repo then replicate to dxos.org

Publishing locally

    [DNS domain subnet]/[authority]]/[resource]






//  https://notepad.rich.dxos.org

- Each KUBE Node runs an HTTP server (e.g., ).

- ISSUE: should we reserve /app prefix in URL?

- DNS
  - domain authority (https)

- Global namespace for resources (dxn)

```






## Architecture

![Meta Graph](./diagrams/meta-graph-architecture.drawio.svg)

![Meta Graph](./diagrams/meta-graph-schematic.drawio.svg)

![Meta Graph](./diagrams/meta-graph-service-monitor.drawio.svg)





## Issues

2022-07-24 [RB]

- What are the relationships between URL => Realm => Refs (and the implied mapping)?
- Of course URL => Subnet, but the part of the URL that isn't just the host (i.e., subnet) consists of (possibly) a subdomain name (alice.example.com) and a path (/notepad). 
- That's what i'm calling a "name" or DXN (i.e., alice/notepad). 
- So a URL identifies both a Subnet and a resource Name (DXN).
- Names (DXNs) contain both a Realm and a Resource (path). E.g., "alice.notepad" references the Realm "alice" and the Resource "notepad".
- Questions:
- 1. Can Realms be hierarchical (e.g., dxos.devnet vs. alice).
- 2. Are Realms fixed to Subnets? Are they fixed to Domain names? (What if I don't have a domain name? What if I want to transfer them?). I don't think they are. 
- 3. But if not, then how do we have globally unique Realm names?
- 4. DMG maintains the map between the name and the refs -- what is the model for this? Each subnet is responsible for maintaining it's own map -- since each subnet is the AUTHORITY (with different forms of consensus) for it's SET of realms.

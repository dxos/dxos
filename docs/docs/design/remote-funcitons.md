# Remote Functions

Remote functions are part of the DXOS extenisbility framework that enables developers to deploy long-running agents and invoke short-lived functions that have access to Spaces.

## Spec

- Run long-lived functions that operate over users' ECHO spaces and interace with external systems.
- Isolation of individual functions.
- Controlled access to resources (e.g., storage, network). Enables "pure" stateless funcitons.
- Functions triggered by external events (e.g., signaling, HALO/ECHO mutations, timers, other functions).
- Global registration and discovery (DMG).
- Life cycle management (i.e., install, start, pause, stop, destory).


## Use Cases

- Backups and epoch management for individual private and shared spaces (auto-provisioned by user/app.)
- Universal search across user's (or groups)'s spaces.
- Local training of LLM over a set of spaces.
- Bridges to external data sources (e.g., Protonmail, Calendar, enterprise SQL database, web crawler, OAuth APIs.)


## Goals

- Reuse of existing open source systems.
- Memory efficient runtime enabling high density.
- Support multiple runtimes (e.g., WASI; potential to run within browser).
- Local testing environment.
- Ability to self-host (e.g., not require require complex K8s infrastructure)


## Non-Goals

- Coordination of funtions (or function state) runtime across multiple VMs (i.e., homogenous network).
- Scale-on-demand: Functions run within the context of a deployed agent; it is not expected to support running 100s of function invocations. "Heavy lifting" might be achieved via external systems, which are out of bound.


## Issues

- Access control via KUBE credentials.
- Agent identity (HALO). Agents create credentials that enable either direct control by a user -- or via user's with access to credentials within a Space.
- Agent's with multiple "devices" -- corresponding to multiple VM deployments (engable migration).
- Support for low-spec machines (e.g., Raspberry PI, IoT).
- Access control for inbound events.
- Asynchronous functions (e.g., async external function calls); implement via chaining?
- Security, isolation. 
- KMS (HALO + external keys: e.g., OAuth tokens; token renewal via public DNS endpoint).


## Archiecture

### Definitions

- **VM**: Docker machine.
- **Orchestrator**:
  - manages life-cycle of agents and functions.
  - manages agent connectivity (e.g., swarms).
  - controls funciton invocation via events.
  - monitoring and resource management.
- **Agent**: 
  - DXOS peer (`@dxos/client`) with HALO (identity) and access to Spaces.
  - Context for function invocation.
- **Function**:
  - Short-lived function ("lambda").
  - Invoked with context (Agent, resource APIs) and event.
  - DMG record (module) defines a group of Functions, and their runtime requirements (runtime, resources, versioned APIs, and dependency graph -- which may include other functions.) Module definition includes the CID or the resource bundle.
  - Resources may include "system" services (e.g., storage, network access) and external endpoints (e.g., Local network services like IMAP server, LLM, or remote services like OAuth gateways.)
- **DMG**:
  - Federated registry that enables publishing and discover of funcitons.
  - Content-addressable graph database; contains dependency graph.
  - Allows for isolated (private) registration, and federation across DXOS ecosystem (via DXN URIs: e.g., `org.dxos/function/universal-indexer`, `com.example/function/llama-training`, `com.example/function/proton-mail-bridge`)

### Schematic

![d](./diagrams/remote-functions.drawio.svg)


### Research

- OpenFaas, `faasd`
- Fission.codes (IPVM)
- Fission.io
- Up: https://github.com/apex/up
- Serverless: https://www.serverless.com/framework
- https://aws.amazon.com/blogs/opensource/24-open-source-tools-for-the-serverless-developer-part-1/
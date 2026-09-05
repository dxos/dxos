![img](https://media.dxos.network/dxos-logotype-blue.png)

# The Decentralized Operating System

DXOS is a platform for building software where the data belongs to the people using it, and where AI agents work for those people — not for whoever operates the server. This document explains the thinking behind Composer and the systems underneath it.

## Our Philosophy

Two decades of cloud software settled on one architecture: a server in the middle, owned by the vendor, holding the data. It bought sync, collaboration, and access from anywhere, but the cost was structural — your documents live on someone else's computer, readable only through their application, and every boundary between your tools is a business boundary rather than a technical one.

AI agents inherit this arrangement at its worst. An agent that could genuinely help needs to see your work as a whole; instead it gets a chat window and per-vendor integrations — a narrow view into one silo at a time, with context that evaporates between sessions. We think the fix is not better integrations but different ground: privacy-preserving infrastructure where data lives with its owner, and decentralized agents that run under your control, on your data, for you.

## Decentralized Agents

DXOS treats an agent as a peer in the system, not a feature bolted onto one. Agents operate inside a space with exactly the access you grant — the same access-control model that governs a human collaborator. They act through the same typed operations the application itself uses, so their changes land on real objects, are recorded in the same history as everyone else's edits, and can be reviewed or undone. Their context persists because the space persists: an agent picks up where the work is, not where the last conversation ended.

Because every capability in Composer — data types, UI, functions — is exposed through the plugin system, an agent is threaded into everything the platform can do: it can query the database, invoke operations, produce documents and tables and sketches, and drive long-running workflows, all within the boundary of the space you shared with it.

## Privacy and Security (HALO)

HALO is the identity layer. Your identity is a public/private key pair generated on your device — there is no account, no password, and no signup with any service. Credentials and keys are stored locally; additional devices are joined by invitation and synchronize your identity and spaces, and any device can later be revoked. Recovery works via a recovery code or a passkey. Permissions in DXOS are credentials issued and held by you, which is what makes granting access to a person — or an agent — auditable and reversible.

## Graph Database (ECHO)

ECHO is the database: a peer-to-peer graph object store. Data is organized into spaces — the unit of sharing and access control — each a database replicated by the peers you invite. Objects are typed, hold values and references to other objects (forming graphs), and support multiple concurrent writers: edits made offline merge deterministically when peers reconnect, using CRDTs rather than a central arbiter. Applications read it through reactive queries, so every view — and every agent — sees changes as they happen. There is no server-side copy that outranks yours; replicas are equal, and yours is on your device.

## Architecture (EDGE Services)

Peer-to-peer covers devices that are online together. EDGE is DXOS's service layer for everything else: always-available sync relays so spaces converge when your devices aren't awake at the same time, signaling for peer connections, blob storage, and hosted AI services. It is also where agents run when they need to outlive a browser tab — as functions executing against the spaces you have granted them, with their activity captured as ordinary ECHO mutations, so the history, review, and undo story is the same whether a change came from you, a collaborator, or an automation.

Together this is what we mean by an operating system for agents: identity and permissions from HALO, shared state and history from ECHO, execution and reachability from EDGE, and capabilities from plugins — one substrate under everything, instead of a stack of per-vendor APIs.

Composer is the reference application built on all of it, and everything is open source. It is early: some of what's described here runs today, and some is further along as a design than as a product.

## Join us

DXOS is built in the open by a worldwide community — software engineers, product managers, UX designers, researchers, and people who simply want their tools to work differently. There is room for every kind of contribution: build a plugin, design a workflow, shape the product, report what breaks, or challenge the architecture. If the ideas here resonate, come make them real with us.

[GitHub](https://github.com/dxos/dxos) · [Docs](https://docs.dxos.org) · [Discord](https://dxos.org/discord)

![img](https://media.dxos.network/bg-echo.svg)

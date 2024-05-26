//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { RevealPlayer } from './Reveal';

// https://revealjs.com/markdown
// https://developer.mozilla.org/en-US/docs/Web/CSS/background-position
// https://colorhunt.co/palettes/dark
// https://fontsource.org/fonts
// https://fonts.google.com
const content = `
<!-- 
.slide: data-background="#111"
-->

<style type="text/css">
  .reveal h1 {
    font-weight: 100;
    padding-left: 36px;
    opacity: 0.5;
  }
  .reveal h2 {
    font-weight: 100;
    padding-top: 60px;
    padding-left: 40px;
    font-size: 48px;
    opacity: 0.3;
  }
  .reveal h1, h2, p {
    font-family: "Raleway", sans-serif;
    text-align: left;
    font-weight: 200;
  }
  .reveal ul {
    font-family: "Raleway", sans-serif;
    display: block;
    list-style: "- ";
  }
  .reveal blockquote p {
    font-weight: 100;
    padding: 32px;
  }
</style>

![img](https://dxos.org/images/logo/dxos-logotype-white.svg)

Join our Discord <!-- .element: class="!text-center" -->
<br>
[dxos.org](https://dxos.org)
<br>
[x.com/dxos_org](https://x.com/dxos_org)

notes:
- our mission is to enable developers to build commercially competitive applications
- set out to investigate what it would take to build a fully decentralized platform

---
> What is an Operating System?

1. Storage
2. Access control
3. Networking
4. Compute
5. Shell

notes:
- more difficult when decentralized; online/offline
- some form of user management; permissions; collaboration
- irony of the cloud internet has become centralized; client/server
- real power of the cloud; new compute paradigms; AI; but moving to the edge; offline/latency
- interaction model; terminal; windows

---
<!-- 
.slide: data-background="#00224D" data-background-image="https://raw.githubusercontent.com/dxos/dxos/main/packages/ui/brand/assets/icons/black/icon-echo.svg" data-background-position="95% 50%" data-background-size="30%"
-->

# ECHO

- Graph database
- Effect Schema
- Automerge FTW
- Subscriptions
- Federated Hypergraph

## Distributed Data

---
<!-- 
.slide: data-background="#5D0E41" data-background-image="https://raw.githubusercontent.com/dxos/dxos/main/packages/ui/brand/assets/icons/black/icon-halo.svg" data-background-position="95% 50%" data-background-size="30%"
-->

# HALO

- Decentralized identity
- Access control
- Device management
- Recovery
- Credentials + key management

## Identity & Security

---
<!-- 
.slide: data-background="#A0153E" data-background-image="https://raw.githubusercontent.com/dxos/dxos/main/packages/ui/brand/assets/icons/black/icon-mesh.svg" data-background-position="95% 50%" data-background-size="30%"
-->

# MESH

- P2P Network
- WebRTC + Web socket
- Encrypted
- Private key exchange
- Signaling

## Resilient Networks

---
<!-- 
.slide: data-background="#FF204E" data-background-image="https://raw.githubusercontent.com/dxos/dxos/main/packages/ui/brand/assets/icons/black/icon-kube.svg" data-background-position="95% 50%" data-background-size="30%"
-->

# KUBE

- Decentralized Functions
- Triggers (cron, query, socket)
- Messaging relay
- ETL pipelines
- AI agents

## Decentralized Compute

---
<!-- 
.slide: data-background-transition="zoom" 
-->

# Composer <!-- .element: class="!text-center pr-[40px]" -->

> *Super App*: n. A mobile or web application that integrates a wide variety of services and functions into a single platform.
`;

const Story = () => {
  return <RevealPlayer content={content} />;
};

export default {
  title: 'plugin-presenter/Reveal',
  render: Story,
};

export const Default = {};

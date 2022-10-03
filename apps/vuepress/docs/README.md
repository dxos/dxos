---
home: true
title: Home
heroImage: /images/hero.png
heroImageDark: /images/hero.png
actions:
  - text: Get Started
    link: /guide/quick-start.html
    type: primary
  - text: Introduction
    link: /guide/
    type: secondary
features:
  - title: 'Local consensus: ECHO'
    details: State synchronization under real-time multiple writers and latent offline writers between a group of peers.
  - title: 'Peer networking: MESH'
    details: Peer discovery, NAT traversal.
  - title: 'Infrastructure: KUBE'
    details: Deploy and host your code making it available to the network.
  - title: 'Identity: HALO'
    details: Decentralized, private, secure, convenient identity.
footer: MIT Licensed | Copyright © DXOS.org
---

<script setup>
  import { createElement, useState } from 'react';

  const Test = () => {
    const [value, setValue] = useState(0);

    return createElement(
      'button',
      { onClick: () => setValue(value => value + 1) },
      value
    )
  };
</script>

<div id="test"></div>

<ReactTest
  target="test"
  :component="Test"
/>

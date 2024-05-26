//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

// eslint-disable-next-line no-restricted-imports
import 'reveal.js/dist/reveal.css';
// eslint-disable-next-line no-restricted-imports
import 'reveal.js/dist/theme/black.css';

import React, { useEffect, useRef } from 'react';
import Reveal from 'reveal.js';
// @ts-ignore
import Markdown from 'reveal.js/plugin/markdown/plugin.js';

// TODO(burdon): Background logos.
const content = `
<!-- .slide: data-background="#111" -->
![img](https://dxos.org/images/logo/dxos-logotype-white.svg)

Join our Discord
<br>
[dxos.org](https://dxos.org)
<br>
[x.com/dxos_org](https://x.com/dxos_org)
---
<!-- .slide: data-background="#009900" -->
# ECHO

- Graph database
- Internet scale
- Access control

---
<!-- .slide: data-background="#009900" -->
# ECHO

- Graph database
- Internet scale
- Access control

---
<!-- .slide: data-background="#990000" -->
# HALO

- Identity
- Access control
- Credentials

---
<!-- .slide: data-background="#000099" -->
# MESH

- P2P Network
- Client/Server
- Encryption

---
<!-- .slide: data-background="#559955" -->
# KUBE

- Decentralized Functions
- Agents
- AI

---
# Composer
<!-- .slide: data-background-transition="zoom" -->
> Super-App: A mobile or web application that integrates a wide variety of services and functions into a single platform.
`;

// https://revealjs.com/react/
const Story = () => {
  const deckDivRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<Reveal.Api | null>(null);
  useEffect(() => {
    if (deckRef.current) {
      return;
    }

    setTimeout(async () => {
      // https://revealjs.com/config
      // https://github.com/hakimel/reveal.js
      deckRef.current = new Reveal(deckDivRef.current!, {
        progress: false,
        transition: 'none',
        // center: false,

        // https://revealjs.com/markdown
        plugins: [Markdown],

        // See https://marked.js.org/using_advanced#options
        markdown: {
          gfm: true,
        },
      });

      await deckRef.current.initialize();
    });

    return () => {
      try {
        if (deckRef.current) {
          deckRef.current.destroy();
          deckRef.current = null;
        }
      } catch (err) {
        // log.catch(err);
      }
    };
  });

  return (
    <div className='absolute flex inset-0 border-8 border-neutral-800'>
      <div ref={deckDivRef} className='reveal'>
        <div className='slides'>
          <section {...{ 'data-markdown': [] }}>
            <textarea {...{ 'data-template': true }} defaultValue={content}></textarea>
          </section>
        </div>
      </div>
    </div>
  );
};

export default {
  title: 'plugin-presenter/Reveal',
  render: Story,
};

export const Default = {};

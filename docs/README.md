# DXOS Docs

- Current focus is around building a Composer plugin
- later the docs for ECHO, HALO, PLEX, etc. should evolve independently
- as more content is added, use https://diataxis.fr/ to guide structure

## Writing a page

- `SPEC.mdl` says what each page covers and which template it follows. Change the spec before the page.
- The docs have a voice of their own (`SPEC.mdl`, `F-22`). Its rules and before-and-after examples are in the
  `docs-writing` skill, at `.agents/skills/docs-writing/`.
- Check a page against the voice, and a rewrite against the version it replaces, from the repo root:

  ```bash
  node .agents/skills/docs-writing/scripts/check-voice.mjs docs/src/content/docs/docs/echo/overview.mdx
  ```

## Starlight Starter Kit: Basics

### 🚀 Project Structure

Inside of your Astro + Starlight project, you'll see the following folders and files:

```
.
├── public/
├── src/
│   ├── assets/
│   ├── content/
│   │   ├── docs/
│   └── content.config.ts
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

Starlight looks for `.md` or `.mdx` files in the `src/content/docs/` directory. Each file is exposed as a route based on its file name.

Images can be added to `src/assets/` and embedded in Markdown with a relative link.

Static assets, like favicons, can be placed in the `public/` directory.

### 👀 Want to learn more?

Check out [Starlight’s docs](https://starlight.astro.build/), read [the Astro documentation](https://docs.astro.build), or jump into the [Astro Discord server](https://astro.build/chat).

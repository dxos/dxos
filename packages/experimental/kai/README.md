# Kai (貝)

A simple DXOS progressive web app (PWA).
The word kai (貝) is the Japanese word for shell.

## Development

```bash
pnpm nx serve kai
```

To run with automatic profile creation and simplified invitation flows:

```bash
KAI_DEV=1 pnpm nx serve kai
```

## Deploying the App

- Published via CI (using KUBE access token) when committed to `main`.
  - https://kai.dev.dxos.org (w/ PWA; via Cloudflare)
  - https://kai-web.dev.kube.dxos.org (no PWA; direct from KUBE)
- To manually publish to local KUBE (via custom `dx.yml`):
  - TODO(burdon): Change to config app arg name:
  - `dx app publish --config_path=./dx-local.yml`


```bash
dx app publish
```

## Roadmap

- TODO(burdon): Move to Milestone.

- [ ] Deprecate Kitchen Sink.
- [ ] Playwright tests/demo.
- [x] Deploy mobile app.
- [x] Import/export JSON.
- [ ] OpenAI bot demo (e.g., fill in background information on Orgs).

- [ ] Kanban column width on mobile (change breakpoint dep on phone).
- [ ] Kanban card expand.
- [ ] Data navigation (slide views).
- [ ] Undo butterbar.

- [x] Selector control.
- [ ] Search (filtering).
- [ ] Saved prefs (e.g., persistent).
- [ ] Menu.
- [ ] CRM/KM (Airtable + reusable cards).
- [ ] Graph control with pop-up.
- [ ] Integrate with Devtools.
- [ ] Virtual table (columns, rows):
  - https://react-table-v7.tanstack.com
  - https://bvaughn.github.io/react-virtualized/#/components/Masonry
- [ ] Super app (WeChat/Twitter) for IPFS:
  https://youtu.be/zRcl77pnbgY?t=1835 (Scott Galloway)

- [x] Profile.
- [x] Invitations configuration.

### UX Issues.

- [ ] Controlled vs. non-controlled (`itmems` and `value` property.)
- [ ] Getters (decouple from ECHO objects).
- [ ] Theme: 
  - [ ] Mobile font size.
  - [ ] AppBar/Accent colors.
- [ ] Consistent styles for controls (e.g., bg color).
- [ ] Styling slots?
- [ ] i18n Text properties (e.g., placeholder.)

### UX Framework

- [ ] Containers and Responsive Cards

### Framework/ECHO Issues

- [ ] Set undefined value.
- [ ] Don't throw undefined if access unset value (e.g., org.address.city).
- [ ] Can't set complex value (see echo-typegen tests)
- [ ] Splice (drag and drop).
- [ ] Scalar sets (e.g., Project tags for kanban).
- [ ] Materialized links (referential integrity).
- [ ] Device management.
- [ ] Save space credentials (membership) to HALO.
- [ ] Introspect types (see meta table).
- [ ] Reset (data services).

### SDK

- [ ] dxtype build rule.
- [ ] Schema docs

## Refs

- https://w3c.github.io/manifest
- https://github.com/mdn/pwa-examples/tree/master/a2hs
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Add_to_home_screen
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Installable_PWAs
- https://developer.mozilla.org/en-US/docs/Web/Manifest
- https://web.dev/how-to-use-local-https

### UX

- https://tailwindcss.com/docs/utility-first
- https://play.tailwindcss.com
- https://phosphoricons.com

### Data

- https://fakerjs.dev/api

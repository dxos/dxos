# @dxos/plugin-lighthouse

Composer as lighthouse's web UI. A **Research** hands a goal to a lighthouse search session (an agent that searches
the web and keeps what it finds as an RDF graph) and shows it the way plugin-commerce shows a Search: the goal,
budget and search engines with Run, and the session's steering thread, on the left; the results ranked by the
session's rating model, as a masonry, on the right; the selected result's facts, provenance and extensions in the
companion. The agent's picks and the results you star are kept in the space as immutable Findings.

Lighthouse runs outside Composer, as its workspace daemon; the plugin reaches it through its HTTP API (`/v1`). All
of the HTTP lives in `src/client/`. See [PLUGIN.mdl](./PLUGIN.mdl) for the spec.

## Connecting

1. Start the daemon in a lighthouse workspace; it listens on `http://127.0.0.1:4319`.
2. `lighthouse api token` prints the workspace's API token.
3. In Composer, enable Lighthouse in the plugin registry, then add a **Lighthouse** connection in Settings →
   Connections with the server URL and the token.

## Development

```bash
moon run plugin-lighthouse:build
moon run plugin-lighthouse:test
moon run plugin-lighthouse:lint -- --fix
```

Stories (`plugins/plugin-lighthouse/*`) run on fixture data through a fixture client (`src/testing/`), so they need no
lighthouse server. The demo flow is `autocue/research.mjs`.

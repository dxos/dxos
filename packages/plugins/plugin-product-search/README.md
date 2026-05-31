# @dxos/plugin-product-search

Structured product search across configurable vendor sites (e.g. AutoTrader, Rightmove, Amazon).

The plugin does **not** ship hand-written parsers. Instead it is an *engine* plus an *LLM-authored
template*:

- A **Provider** is a template describing how to search one site: a typed search-field schema, a
  request mapping (criteria → URL/params), and a result mapping (response → listing fields). The
  template is authored by an LLM (the provider blueprint analyses a real page and writes it) and is
  user-editable.
- A **Search** holds an array of Providers plus key/value criteria.
- **Results** are extracted listings stored as linked objects, shown in a masonry master/detail UI.

Pages are fetched through a **Fetcher** that prefers the `@dxos/composer-crx` browser extension's
render-proxy (real-browser rendering for client-rendered / anti-bot SPA sites) and falls back to the
edge HTTP proxy. See `@dxos/plugin-extension` for the render-proxy settings.

## Testing

All commands run from the worktree root.

```bash
moon run plugin-product-search:build
moon run plugin-product-search:test
moon run plugin-product-search:lint -- --fix
```

### What the tests cover

- **Pure engine** (`bindRequest`, `extractResults`, `cleanHtml`): criteria→URL binding and
  listing extraction over fixtures.
- **Real-markup extraction** (`autotrader-fixture.test.ts`): the extractor pulls ≥10 listings from a
  committed *cleaned* capture of a real AutoTrader results page.
- **Fetcher routing** (`renderViaCrx.test.ts`): the render-proxy contract and the
  render → edge-proxy fallback (jsdom).
- **LLM generates a parser** (`generate-template.blueprint.test.ts`): the headline end-to-end test.
  The provider blueprint runs against a real (cleaned) AutoTrader page with the edge fetch mocked;
  the LLM authors the search schema + request + result mappings, and the generated result mapping is
  applied back to the page to confirm it extracts listings.

### Memoized LLM test

The blueprint test replays a **recorded** conversation (`*.conversations.json`) so CI runs offline
and deterministically — no API key, no network. To re-record after changing the prompt, blueprint,
or tool schemas:

```bash
ALLOW_LLM_GENERATION=1 moon run plugin-product-search:test -- generate-template
```

This calls the real model over `edge-remote` (~2 min) and rewrites the committed
`generate-template.blueprint.conversations.json`. Commit the regenerated fixture. Replay matching is
date-independent: message timestamps and the system-prompt date line are normalised in the
memoization layer, so a fixture recorded on one day replays on any later day.

### Live fixtures

Raw multi-MB "Save Page As" captures (e.g. `autotrader-results.html`, `rightmove.html`) are
gitignored under `src/testing/fixtures/`. Only the small *cleaned* sample
(`autotrader-results.sample.html`, produced by `cleanHtml`) is committed.

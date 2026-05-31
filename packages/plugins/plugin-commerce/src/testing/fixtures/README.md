# Test fixtures

Real, rendered HTML used to test the engine's LLM-driven parser generation + extraction.

## Capture (how the raw fixtures were made)
1. Run a real search on the target site (logged in / normal session).
2. With the page fully rendered: DevTools → Elements → right-click `<html>` → Copy outerHTML,
   or File → Save Page As → "Webpage, Complete".
3. Save as `<site>-results.html` (+ optional `<site>-search.html`).

The raw `*.html` + `*_files/` are gitignored (multi-MB / third-party). Only the small
`*.sample.html` (produced by `cleanHtml`, see `src/util/cleanHtml.ts`) is committed and used by tests.

## AutoTrader UK results query (for request-mapping tests)
https://www.autotrader.co.uk/car-search?channel=cars&postcode=ws149el&make=Porsche&model=911&homeDeliveryAdverts=include&advertising-location=at_cars&year-to=2026

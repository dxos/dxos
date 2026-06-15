# @dxos/stories-inbox

Cross-cutting storybook stories for `plugin-inbox`.

Stories that exercise `plugin-inbox` together with sibling plugins (plugin-trip, future plugin-feed, etc.) live here so the test fixtures can register the real extractors from those plugins — `plugin-inbox` itself cannot depend on its consumers without creating dependency cycles.

Story families:

- `MessageArticle` — renders `MessageArticle` with multiple registered `MessageExtractor` implementations (`ContactMessageExtractor` from plugin-inbox, `TripMessageExtractor` from plugin-trip) and a seeded message that matches both, so the toolbar `Extract` dropdown surfaces every entry and clicks produce real `Person` / `Booking` / `Segment` objects via the `ExtractMessage` dispatcher.

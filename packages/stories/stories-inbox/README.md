# @dxos/stories-inbox

Cross-cutting storybook stories for `plugin-inbox`.

Stories that exercise `plugin-inbox` together with sibling plugins (plugin-trip, future plugin-feed, etc.) live here so the test fixtures can register the real extractors from those plugins — `plugin-inbox` itself cannot depend on its consumers without creating dependency cycles.

Story families:

- `MessageArticle` — renders `MessageArticle` with multiple registered `MessageExtractor` implementations (`ContactMessageExtractor` from plugin-inbox, `TripMessageExtractor` from plugin-trip) and a seeded message that matches both, so the toolbar `Extract` dropdown surfaces every entry and clicks produce real `Person` / `Booking` / `Segment` objects via the `ExtractMessage` dispatcher.

## Capturing a real mailbox fixture

The synthetic fixtures in `src/testing/` cover the shapes we designed for. A **real** mailbox is what surfaces the ones we didn't — odd MIME structures, bulk-mail headers, senders that defeat the extraction gate. The `MailboxSync` story captures one; `scripts/fixtures.mjs` stores it.

Captured archives keep their PII. They are encrypted under **your own** age key before upload, so nobody else — including whoever administers the bucket — can read them, and they never enter git or CI.

### One-time setup

```bash
mkdir -p ~/.config/dxos
age-keygen -o ~/.config/dxos/fixtures.key
```

Store that file in 1Password, then export it (an `op://` reference works too, and is read only for the life of the command):

```bash
export DX_FIXTURES_AGE_KEY=~/.config/dxos/fixtures.key
```

Authenticate wrangler for the private `test-fixtures` bucket:

```bash
pnpm 1p-credentials
```

### Capture and upload

1. Run the `MailboxSync` story and **Connect** a real mail account, then sync.
2. Choose what to capture in the `Archive` panel:
   - **Download starred** — star the messages worth keeping first. A curated subset: use it for a fixture that illustrates specific shapes.
   - **Download all** — the whole feed, unfiltered. Use it for a corpus: volume, bulk-mail headers, and the senders a curated set would never include are exactly what shakes out pipeline bugs.
3. Either saves `mailbox-feed.json`.
4. Upload it:

```bash
pnpm fixtures push ~/Downloads/mailbox-feed.json --name inbox
```

The printed key looks like `mailbox/<user>/inbox-<date>.json.age`. `pnpm fixtures list` shows yours.

To hand one archive to a teammate, encrypt to their public key instead — a deliberate, per-object act:

```bash
pnpm fixtures push ~/Downloads/mailbox-feed.json --recipient age1...
```

## Using a real mailbox in a test

Pull the archive on whichever machine will run the test. It decrypts into the git-ignored `stories-brain/fixtures/local/` (the script refuses to write anywhere else):

```bash
pnpm fixtures pull
```

Consumers read that path by default; `MAILBOX_FEED_FIXTURE` overrides it. The loader lives in `@dxos/stories-brain` (`src/testing/harness/fixture.ts`) and does the three things a raw archive needs: mints fresh message ids, collapses the MIME alternatives into one clean text block (HTML→Markdown), and sorts **oldest-first** — a cursored pipeline advances a high-water mark, so an unsorted feed would silently skip everything older than the first message it saw.

```ts
import { fixtureExists, loadFixtureMessages, seedFeed } from '../testing/harness/fixture';

describe.skipIf(!fixtureExists())('pipeline over a real mailbox', () => {
  test('extracts contacts without duplicates', async ({ expect }) => {
    const messages = loadFixtureMessages({ limit: 200 });
    const feed = await seedFeed(db, messages);
    // …run the pipeline against `feed`.
  });
});
```

Three rules for these tests:

1. **Gate on `fixtureExists()`.** CI has neither the bucket credentials nor an age key, so the fixture is absent there and the test skips — coverage that depends on a private corpus must never be able to fail the build.
2. **Assert invariants, not counts.** The archive changes every time you re-export it. `expect(persons).toHaveLength(12)` is unmaintainable; assert instead that every `Person` has an email, that no two share a normalized address, that a second run creates nothing, that the cursor equals `max(created)`.
3. **Seed the gate.** `shouldExtractContact` is an allow-list — a sender earns a `Person` only when its domain matches a known `Organization`. Against a raw archive with no Organizations seeded, a CRM pipeline test will pass while extracting nothing. Derive Organizations from the archive's sender domains first.

Today `loadFixtureMessages` is reachable only from `@dxos/stories-brain` (a private package). Consuming a real archive from a publishable package's unit tests needs that loader promoted to a node-only shared entry point — see `plugin-crm/DESIGN.md` §8.

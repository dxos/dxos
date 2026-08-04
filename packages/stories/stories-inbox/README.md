# @dxos/stories-inbox

Cross-cutting storybook stories for `plugin-inbox`.

Stories that exercise `plugin-inbox` together with sibling plugins (plugin-trip, future plugin-feed, etc.) live here so the test fixtures can register the real extractors from those plugins — `plugin-inbox` itself cannot depend on its consumers without creating dependency cycles.

Story families:

- `MessageArticle` — renders `MessageArticle` with multiple registered `MessageExtractor` implementations (`ContactMessageExtractor` from plugin-inbox, `TripMessageExtractor` from plugin-trip) and a seeded message that matches both, so the toolbar `Extract` dropdown surfaces every entry and clicks produce real `Person` / `Booking` / `Segment` objects via the `ExtractMessage` dispatcher.

## Capturing a real mailbox fixture

The synthetic fixtures in `src/testing/` cover the shapes we designed for. A **real** mailbox is what surfaces the ones we didn't — odd MIME structures, bulk-mail headers, senders that defeat the extraction gate. The `MailboxSync` story captures one; `tools/fixtures` stores it.

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
3. Either saves `mailbox-<version>.json`, stamped with the capture time (`mailbox-20260804-185124.json`).
4. Upload it — the asset name and version both come from the filename, so there is nothing to pass:

```bash
moon run fixtures:push -- ~/Downloads/mailbox-20260804-185124.json
```

The archive keeps **one identity everywhere** — `mailbox-20260804-185124.json` on disk, `mailbox/<user>/mailbox-20260804-185124.json.age` in R2 — and the version is the moment the mailbox was captured, not when it happened to be uploaded. Pushes accumulate rather than overwrite, so a result can be reproduced against the exact corpus that produced it. (`--name` overrides the asset name; a file with no stamp gets one at push time.) Nothing can enumerate that history — wrangler's R2 surface is get/put/delete only — so each push also writes a few-byte `mailbox.latest` pointer naming the newest version; that is what lets `pull mailbox` resolve without a listing. Browse the full history in the Cloudflare dashboard.

To hand one archive to a teammate, encrypt to their public key instead — a deliberate, per-object act:

```bash
moon run fixtures:push -- ~/Downloads/mailbox-20260804-185124.json --recipient age1...
```

## Using a real mailbox in a test

Pull the archive by name on whichever machine will run the test. It decrypts into the git-ignored `testing/fixtures/` at the repo root — one shared directory, so a corpus pulled once serves every package:

```bash
moon run fixtures:pull -- mailbox
```

That takes the newest version. Pin one with `--at 20260804-181500`, and pull a teammate's with `--user <name>` (only decryptable if they pushed it to your key). `moon run fixtures:list` shows local versions, newest first.

### Sanity check

`moon run fixtures:info` reports what is available and how this machine is configured — the first thing to check when a fixture-backed test skips unexpectedly, since it separates "nothing pulled" from "pulled but misconfigured":

```
directory:  …/testing/fixtures
bucket:     test-fixtures
identity:   ~/.config/dxos/fixtures.key
user:       burdon

mailbox
  * 20260804-190236      14974 KB  386 entries

* = resolved by default
```

Then run the mailbox pipeline check, which seeds a Mailbox feed from the archive and drives it through a minimal `@dxos/pipeline` (source → stages → sink):

```bash
moon run stories-inbox:test -- src/test/mailbox-fixture.test.ts
```

It asserts the count survives ingestion — neither dropped nor duplicated — and that the fields every mail pipeline reads (`created`, a text block) are present, then logs the corpus summary. Running it first separates *"the transfer worked"* from *"my pipeline is wrong"*, which are easy to confuse when a test over a real corpus misbehaves. With no fixture present it skips, so it is safe anywhere including CI. Point it at another fixture with `DX_FIXTURE_NAME=<name>`.

Resolve it by name from any package with `@dxos/fixtures` (node-only):

```ts
import { fixtureExists, fixturePath, fixtureVersions, readFixture } from '@dxos/fixtures';

readFixture('mailbox');                                  // newest local version
readFixture('mailbox', { version: '20260804-181500' });  // pinned
```

Message reconstruction lives in `@dxos/stories-brain` (`src/testing/harness/fixture.ts`) and does the three things a raw archive needs: mints fresh message ids, collapses the MIME alternatives into one clean text block (HTML→Markdown), and sorts **oldest-first** — a cursored pipeline advances a high-water mark, so an unsorted feed would silently skip everything older than the first message it saw.

```ts
import { fixtureExists } from '@dxos/fixtures';

describe.skipIf(!fixtureExists('mailbox'))('pipeline over a real mailbox', () => {
  test('extracts contacts without duplicates', async ({ expect }) => {
    const messages = loadFixtureMessages({ limit: 200 });
    const feed = await seedFeed(db, messages);
    // …run the pipeline against `feed`.
  });
});
```

Three rules for these tests:

1. **Gate on `fixtureExists('<name>')`.** CI has neither the bucket credentials nor an age key, so the fixture is absent there and the test skips — coverage that depends on a private corpus must never be able to fail the build.
   Pin a version when a result must be reproducible; take the newest when the test asserts invariants that should hold for any corpus.
2. **Assert invariants, not counts.** The archive changes every time you re-export it. `expect(persons).toHaveLength(12)` is unmaintainable; assert instead that every `Person` has an email, that no two share a normalized address, that a second run creates nothing, that the cursor equals `max(created)`.
3. **Seed the gate.** `shouldExtractContact` is an allow-list — a sender earns a `Person` only when its domain matches a known `Organization`. Against a raw archive with no Organizations seeded, a CRM pipeline test will pass while extracting nothing. Derive Organizations from the archive's sender domains first.

`@dxos/fixtures` resolves a fixture by name from anywhere in the monorepo. The message *reconstruction* helpers (`loadFixtureMessages`, `seedFeed`) still live in `@dxos/stories-brain`; consuming a real archive from a publishable package's tests needs those promoted too — see `plugin-crm/DESIGN.md` §8.

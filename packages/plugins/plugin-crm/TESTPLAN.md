# plugin-crm — Test Plan: sync a mailbox, then run the CRM pipeline

Manual walkthrough for verifying the deterministic CRM pipeline end-to-end: mail sync → contact
extraction → profile scaffolding, via both the toolbar action and the feed-triggered routine.
Design + audit: [DESIGN.md](./DESIGN.md). Automated coverage: `src/operations/*.test.ts`,
`src/templates/*.test.ts`, and the `stories-inbox` `ProcessMailbox` story play test.

## 0. Prerequisites

- Composer build with plugin-crm enabled (it is `alpha`-tagged — enable the **CRM** plugin in
  Settings → Plugins), plus Inbox. PR preview: https://pr-12441-composer-main.dxos.workers.dev.
- A Gmail or JMAP (Fastmail) account you can connect.
- **Important — the extraction gate is an allow-list.** A sender earns a Person only when its
  email domain matches an Organization already in the space (no-reply/bulk/role senders never
  do). Before testing, create one `Organization` whose `website` matches the domain of a sender
  you expect mail from (e.g. `https://<your-test-sender-domain>`); senders at unknown domains and
  free-mail senders are deliberately skipped.

## 1. Storybook smoke (no account needed, ~1 min)

1. `moon run storybook-react:serve` → open the `stories/stories-inbox/ProcessMailbox` story
   (Default variant).
2. Click **Run**. Expect the counts panel to show `persons: 3`, `profiles: 3`, `linked: 3`,
   `cursors: 1`, and `last.contacts: 3` (three fixture senders, all at seeded Organizations).
3. Click **Run** again. Expect `last.contacts: 0` and unchanged totals — the cursor + identity
   index make re-runs idempotent.

## 2. Sync a real mailbox

1. Create a Mailbox (Inbox plugin) in a space.
2. In the mailbox toolbar, **Connect** the Gmail/JMAP account and complete auth. The connector
   scaffolds a per-mailbox **Sync** routine (10-minute cron, off by default).
3. Trigger a sync (enable the Sync routine's trigger, or run it once from the mailbox UI) and
   wait for messages to appear.
4. Note: inline with sync, production contact extraction already runs — senders at known
   Organization domains may already have Person records at this point. That path and
   `ProcessMailbox` share the same identity index, so the steps below never create duplicates.

## 3. Toolbar path — `Process CRM`

1. Open the mailbox toolbar menu; next to brain's `Analyze` there is a new **Process CRM** action.
2. Invoke it. Then verify:
   - Nav tree: a **CRM** group appears with **People** (and **Organizations**); senders at known
     domains are listed as Persons, each linked to its Organization (open a Person → `Employer`
     field set).
   - Each new Person has a **Profile document** (child of the Person; sections: Overview, Details,
     Organization, Key Links, Notes, Sources) linked via a `ProfileOf` relation.
   - Free-mail/no-reply/newsletter senders produced **no** Person (gate working).
3. Invoke **Process CRM** again: no new Persons/Profiles (idempotent catch-up; the durable feed
   cursor skips already-processed messages).
4. Sync again after receiving one new message from a known-domain sender, invoke **Process CRM**:
   exactly that sender's Person/Profile is added.

## 4. Template path — pipeline runs on sync

1. From the mailbox (Create → Project, or the mailbox's project entry point), create a project
   from the **CRM Pipeline** template. Verify the scaffold: project with the mailbox in context,
   CRM/web-search/database/markdown skills, and one routine **Process Mailbox** whose trigger is a
   **feed** trigger (disabled by default) bound directly to the `ProcessMailbox` operation.
2. Enable the routine's trigger.
3. Send yourself a test email (from a known-domain sender) and sync (step 2.3). Within ~1s of the
   message landing in the feed, the local trigger dispatcher fires the operation — verify the new
   Person + Profile appear **without any manual action**.
4. Failure/idempotency probes:
   - Fire the trigger repeatedly (several new messages): each firing is a catch-up; totals match
     the number of distinct known-domain senders, never more.
   - Both the trigger's cursor and the operation's cursor advance only past successes, so nothing
     is skipped after a transient failure.
5. Caveat: the `feed` trigger kind runs on the **local** dispatcher only — the app (or story
   harness) must be open for the routine to fire; it does not run on EDGE yet.

## 5. Agentic follow-on (optional)

With the CRM skill enabled in a chat (or via the **Sender Research (CRM)** template), ask the
assistant to research one of the new Persons: it should enrich the existing Profile document in
place (not create a second one) and update the `ProfileOf` relation's sources — the deterministic
operations own structure/provenance; the agent owns content.

## Expected invariants (all paths)

- One Person per distinct sender email, ever — regardless of which path (sync inline extraction,
  `Process CRM`, routine, `ExtractMessage`) created it first.
- One Profile document + one `ProfileOf` relation per subject; re-runs refresh
  `lastResearchedAt` only.
- `Mailbox.extracted` records provenance per processed message (feed messages cannot be relation
  endpoints).
- Two `Cursor` objects per mailbox after using both Analyze and Process CRM (one per consumer,
  disambiguated by a foreign key) — they never interfere.

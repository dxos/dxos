# Composer Agent — HN Video Script v2

Three-minute Show HN demo. Rewritten from the focus-group v1 brief with the
five fixes the reviewers unanimously asked for:

1. Drop the "ambient cinematic" cold open — open on something only a real
   product can show.
2. Lead with explainability, not magic.
3. Show one failure / recovery moment.
4. Make the local-first claim concrete (Wi-Fi yank).
5. Put the cross-surface-chat moment front and center — it's the proof of
   the entire thesis ("agent with one identity across every surface").

Total runtime target: **3:00**. Shot in 4 acts.

---

## Act 1 — Cold open: "this is real" (0:00–0:20)

**Open on a terminal**, full-screen, with the cursor blinking.

```
$ pnpm demo
```

Hit enter. The screen fills with the actual pre-flight output — the credentials
check, the schema registration, the Chromium spin-up. *Nothing is hidden.*
Console warnings stay in. Real PIDs scroll past.

> Voiceover (0:08): "This is the actual demo I'm about to show you. No
> animations, no edits — just the agent waking up."

By 0:18 the Composer pane is open. The Inspector starts flickering as the
agent registers blueprints in real time. Cut to Act 2.

**Why this works:** Reviewers all said the "ambient card slides between
columns" intro looked like every Linear/Notion/Monday demo on the internet.
Terminal output is the one thing a vaporware product can't fake.

---

## Act 2 — The phone-to-home moment (0:20–1:10)

The killer beat. The reviewers' standout-most-wanted feature, now actually
shipped (`b41a477690`).

**Beat A (0:20–0:40):** Slack window in the foreground. The user types in a
DM to the bot:

> "hey, can you summarize what we discussed about the dragging bug last week?"

Bot responds with a context-laden answer that references the Granola meeting
notes already in ECHO. Voiceover:

> "I'm in Slack. The agent has access to my meeting notes, my PR history,
> my Trello board. Let me ask it something specific."

**Beat B (0:40–1:00):** User cmd-tabs to Composer. Voiceover:

> "Now I'm at my desk. I want to keep this conversation, but with my whole
> workspace around me."

In the Composer chat list: a new chat has appeared, named after the Slack
channel. Click it. The full Slack conversation is rendered as a native chat,
with all the message history intact.

User types in Composer:

> "actually, link this to the card Bob owns."

Beat C (1:00–1:10): Cut back to Slack — the same message has appeared as a
reply in the Slack thread. Voiceover:

> "Same conversation. Same memory. The agent doesn't care which surface
> I'm on — it has one identity."

**Why this works:** Person 1 explicitly asked for "command surface inside
Composer, not just Slack notification-and-response." This *is* that.

---

## Act 3 — Explain, fail, recover (1:10–2:20)

Three sub-beats showing the trust loop reviewers asked for.

**Beat A (1:10–1:40) — Explain.** A Granola meeting note arrives. The Inspector
lights up with reasoning steps. Click one — *plain English* (`198ca93b90`):

> "I matched this meeting to card 'Investigate drop target interaction model'
> because the meeting summary mentions 'drop targets flicker' and the card
> description tracks the same regression."

Voiceover:

> "Every decision the agent makes is inspectable. Not raw logs — a sentence
> in the same language I'd use to explain it to a teammate."

**Beat B (1:40–2:00) — Fail.** A merged GitHub PR fires the nudge pipeline.
The agent picks the **wrong card** (deliberate — point at a similar but
incorrect Trello card in the fixture). The nudge appears in the demo panel
with the reasoning attached.

Voiceover, slowing down:

> "It got it wrong. The PR is about widget drag, but it linked to the color
> picker card. So I correct it…"

**Beat C (2:00–2:20) — Recover.** Click the "Wrong card?" select on the nudge
(`183a852188`). Pick the right card. The nudge body updates in place with a
"user-corrected" annotation. Cut to Slack — the post now references the
right card. Cut to Trello — when the user replies "yes," the *correct* card
moves to Done.

Voiceover:

> "I told it once. The agent updated its decision. Trust isn't built by
> capability — it's built by recoverability."

---

## Act 4 — Local-first proof + meta (2:20–3:00)

**Beat A (2:20–2:45) — Wi-Fi yank.** With the Composer chat open, click the
macOS Wi-Fi icon and disconnect. Browser tab is now offline.

Type a new message in the Composer chat. It appears immediately. Switch to
Trello (also offline) — drag a card. Composer reflects the move.

Voiceover:

> "Everything I just did happened on this laptop. No cloud round-trip. ECHO
> is local-first — the agent's memory lives here."

Reconnect Wi-Fi. Watch the chat sync to the other surfaces and the
mirror-tick post the queued message to Slack.

**Beat B (2:45–3:00) — Meta.** Cut to the editor showing
`packages/plugins/plugin-demo/src/cross-surface-chat.ts` — about 250 lines of
TypeScript. Voiceover:

> "All of this — the Slack mirror, the card matcher, the nudge loop — is
> ~1500 lines of plugin code on top of an open-source local-first runtime.
> If you want a Linear plugin or a Discord one, you write it the same way.
> Repo's in the description. `pnpm demo` runs the whole thing."

End card: **dxos.org/composer** + repo URL.

---

## What's been cut from v1

- **The "card slides between columns" cold open.** Replaced with terminal
  pre-flight (above). Reviewers universally panned the original as
  vaporware-vibes.
- **The "ambient music, no voiceover" intro.** Replaced with audible
  terminal hammering and a single line of voiceover at 0:08.
- **The Granola→Trello "convenient happy-path match"** as the differentiator
  beat. Replaced with the cross-surface chat (Act 2) as the lead.
- **Anthropic-badge "local-first" claim made by assertion.** Replaced with
  the live Wi-Fi yank in Act 4.

## Stretch goals (cut for time, keep in pocket)

- **Compose a new plugin on camera** (Person 3's "shut up and take my money"
  ask). 90 seconds of scaffolding a Linear connection. Show after the credits
  if engagement is high.
- **Two agents coordinating** (Person 1 ask). Keep for the follow-up post.

## Recording notes

- Use a single 1280×800 frame so the terminal, Slack, Composer, and Trello
  windows can be tiled. Plan the cmd-tabs in advance.
- Keep voiceover under 60 wpm. The pacing is the differentiator.
- Don't cut the dev-mode warnings out of the terminal. They are credibility
  signal, not noise (Person 1 + Person 3 both flagged this as a smart
  choice in v1).

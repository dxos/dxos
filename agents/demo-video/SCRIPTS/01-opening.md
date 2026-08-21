# Opening — "The Arrangement"

The cold open, shared by all four cuts. Written in a wry, erudite, unhurried register —
Stephen Fry as a *style reference*, not a voice to reproduce (see Casting below).

## Register

Long sentences that earn their length, then a very short one that lands. Mock-grandeur
deflated by plain speech. Precise nouns. Irony that is fond, never sneering. Fry's signature
move is the parenthetical aside delivered as though letting you in on something — use it once,
not three times. Rule of three for rhythm. Never oversell; the product argument is strong
enough that the narration should sound faintly amused by having to make it.

**Pace ~145 wpm.** The pauses are load-bearing; they are marked and should survive the edit.

## Casting — read this before rendering any audio

Write in the register; do **not** clone the man's voice. Synthesising a real, living,
instantly recognisable person's voice for marketing is a likeness problem, not a technical
one, and it is exactly the kind of thing that becomes the story instead of the product. Three
workable options, in order of preference:

1. **Rich's own voice, in this register.** The copy carries the style; a founder reading it is
   more persuasive than any narrator, and there is no rights question at all.
2. **A HeyGen stock voice with the right qualities** — British, mature, dry, unhurried. Cast on
   attributes, not on "sounds like X".
3. **A hired VO artist.** Best result, adds days and cost.

For timing the edit, any synthetic scratch track will do — that is a stopwatch, not a
performance.

---

## Version A — hero opening (~95 s)

> **[1]** There is an arrangement at the heart of modern software that we have all agreed, very
> politely, not to mention.
>
> *(pause)*
>
> **[2]** You pay. Monthly. Forever. For the privilege of keeping your own thoughts on somebody
> else's computer. Your documents, your correspondence, the half-finished idea you had at two in
> the morning — all of it in a rented room, in a building you will never visit, owned by a
> landlord who reserves the right to raise the rent, change the locks, or read your post.
>
> **[3]** We call this progress.
>
> And to be fair, it is convenient. Enormously convenient.
>
> *(beat)*
>
> So was the company store.
>
> *(pause — longest in the piece)*
>
> **[4]** But suppose — do indulge me — suppose it were the other way round.
>
> **[5]** Suppose your data simply lived with you. On your machine. Not a copy, not a cache, not
> some courtesy export in a format nobody can open. The thing itself.
>
> **[6]** And suppose the software came to *it*. That applications were guests — they arrive,
> they do something useful, and they leave. Without taking the furniture.
>
> *(pause)*
>
> **[7]** This is not a small adjustment. It is an inversion. The data no longer depends on the
> application; the application depends on the data. Which means you may change your mind about
> your software without changing your mind about your life's work.
>
> **[8]** That inversion is the whole of it.
>
> **[9]** That is what DXOS is about.

### Visual mapping

| # | On screen | Candidate |
| --- | --- | --- |
| 1 | Black. Type only. Let the line sit. | — |
| 2 | Rented-room montage: a spinner, a paywall, a plan-comparison table, an export dialog offering a `.zip`. Cold, generic, slightly too blue. | new |
| 3 | Hold on "unlimited plan" pricing. Cut to black on *company store*. | new |
| 4 | First sight of Composer. Bramble space opens. Warm, dense, alive — the tonal opposite of [2]. | `B1` |
| 5 | Devtools → local storage. Then pull the network and keep typing. | `E5` |
| 6 | Plugins toggling on; new object types appearing without a reload. | `B5` |
| 7 | **The inversion, shown not said.** ECHO explorer graph; the objects sit still while surfaces change around them — table, kanban, map, chart over the same nodes. | `E1` + `K7` |
| 8 | Graph settles. One node highlights. | `E1` |
| 9 | Wordmark. | — |

Beat 7 is the thesis. If one shot in the whole video has to be perfect, it is that one — and
`K7` is already confirmed working.

### Trims if it must fit 60 s

Cut "the half-finished idea you had at two in the morning" (−9 words), "Enormously convenient"
(−2), and "Not a copy, not a cache, not some courtesy export in a format nobody can open" (−16).
Keep *company store* and keep the whole of [7] — those two carry the piece.

---

## Version B — Cloudflare cold open (~40 s)

Same argument, no scenic route: this room wants the architecture.

> There is an arrangement at the heart of modern software that we have all agreed not to
> mention: you pay, monthly, forever, to keep your own thoughts on somebody else's computer.
>
> *(beat)*
>
> DXOS inverts it. Your data lives with you — on your device, in your hands, yours. The
> applications are guests.
>
> *(pause)*
>
> Which raises an obvious question. If the data is on the device… what exactly is the cloud
> *for*?
>
> *(beat)*
>
> Rather a lot, as it turns out. Just not what you would expect.

Hands directly to the EDGE section: sync, Durable Objects, the services fleet. The rhetorical
question is the hinge — it converts "local-first" from a rejection of the cloud into a
*redefinition* of it, which is the only version of this story that flatters a Cloudflare
audience rather than threatening them.

### Visual mapping

| On screen | Candidate |
| --- | --- |
| Type on black | — |
| Bramble opens; network pulled; editing continues | `E5` |
| Question lands on black | — |
| Sync resumes, follow it into the Durable Object | `W2` |

---

## Recurrence

"Guests" and "inversion" are the two words to plant here and pay off later:

- **Guests** → the plugin registry (`B5`) and plugin development (`V1`) — an app you wrote
  yourself is a guest on the same terms.
- **Inversion** → the agent runtime (`G2`), where every plugin operation is automatically an
  agent tool. The dependency runs the same way round for the machine as for you.

Do not restate either word more than once more each. Fry would not.

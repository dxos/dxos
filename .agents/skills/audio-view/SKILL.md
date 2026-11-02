---
name: audio-view
description: >-
  "Look at" an audio file as an LLM: describe its levels and speech/silence timeline as text, render a labelled
  spectrogram PNG, and replay it through the Whistle speech model to see every pass, committed word and
  pending tail on one clock. Use when debugging a transcript (wrong words, invented "Thank you.", bad paragraph
  splits, latency), when building or running transcription evals over recorded fixtures, or whenever you need to
  reason about a .wav/.m4a you cannot listen to.
---

# Viewing audio

You cannot hear audio, but you can read text and images derived from it. Four scripts in `scripts/` turn a recording
into both; all decode to 16 kHz mono so their times line up. WAV is read natively; other formats need `ffmpeg`.

| Script                                                                                                        | Output                                                                                                                                                                                     | Answers                                                                              |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `describe.mjs <file> [--json]`                                                                                | levels, noise floor, clipping, speech/silence table, a 100 ms loudness strip                                                                                                               | Where are the pauses, how long, how loud is the room?                                |
| `spectrogram.mjs <file> [-o out.png] [--words timeline.jsonl] [--from s --to s]`                              | PNG: time axis, waveform, mel spectrogram (0–8 kHz), speech/silence strip, numbered word spans (legend on stdout)                                                                          | Is there really a gap between two words? Does a word sit on speech, breath or noise? |
| `whistle-replay.mjs <file> [--pass-ms 1000] [--keywords "ECHO, DXOS"] [--reference text] [-o timeline.jsonl]` | every pass (audio time, pass ms, words committed, pending tail), the transcript, per-word confidence, commit lag, words committed in silence; WER and keyword recall against `--reference` | What did Whistle hear, when, and how sure was it?                                    |
| `compare.mjs <file> [--reference text] [--keywords "ECHO, DXOS"] [--language en] [--json]`                    | Whistle and the hosted models side by side: transcript, time and WER per provider; a provider without credentials is listed as skipped                                                     | Is a miss Whistle's, or would a bigger model hear it too?                            |

Read the PNG with the Read tool after rendering it. A typical loop:

```bash
S=.agents/skills/audio-view/scripts
node $S/describe.mjs rec.wav
node $S/whistle-replay.mjs rec.wav --keywords "ECHO, DXOS" --reference "pull up the echo query framework" -o rec.jsonl
node $S/spectrogram.mjs rec.wav --words rec.jsonl -o rec.png
```

## Bigger models

`compare.mjs` sends the same 16 kHz audio to OpenAI (`whisper-1`, `gpt-4o-transcribe`; needs `OPENAI_API_KEY`) and
Cloudflare Workers AI (`@cf/openai/whisper-large-v3-turbo`; needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`).
Keywords go to each as its prompt. Anthropic's API takes no audio input, so it has no row. In the cloud sandbox the
token is exported and the account ID is in 1Password:

```bash
CLOUDFLARE_ACCOUNT_ID='op://eng-dev/com.cloudflare/ACCOUNT_ID' op run -- node $S/compare.mjs rec.wav --reference "…"
```

Whisper-family models echo their prompt over silence, so a keyword list on a silent clip comes back as the transcript.

`compare.mjs` times each provider's whole run, which for Whistle includes loading the model. Latency after the speaker
stops, measured on 1–3 s clips (2026-10-23, this sandbox): Whistle needs 0.44–0.98 s, because its last pass re-decodes
the whole utterance (a single `needle_transcribe` call is no faster), while a Workers AI request takes 0.76–6.1 s,
typically about 2 s, round trip through the sandbox's proxy.

## Silence

`whistle-replay.mjs` opens the stream only once the story's endpointer hears sound (louder than the noise-floor
threshold and -35 dBFS for 0.15 s, with 0.5 s of pre-roll), as the stories' worker does; without that Whistle
transcribes room tone as "Thank you.". `--no-gate` decodes from the first sample, to see what the model alone hears.

## Evals over the fixtures

`packages/plugins/plugin-transcription/src/whistle/fixtures.test.ts` replays the agents-scope `whistle-*`
fixtures in both pass modes, bounds WER and words committed in silence, and logs keyword recall. It is tagged `manual` and
skips without the fixtures:

```bash
for name in whistle-silence whistle-one-two-three whistle-echo-query-a whistle-echo-query-b; do
  moon run fixtures:pull -- $name --scope agents
done
DX_RUN_MANUAL_TESTS=1 moon run plugin-transcription:test -- src/whistle/fixtures.test.ts
```

## How to read the results

- **Invented words** ("Thank you.", "you") show up as words committed in silence, or with low `p`.
- **Paragraph splits** in the story need 1.5 s of silence; check `describe`'s timeline for the pause actually there.
- **Commit lag** is how long after a word ends it was committed; roughly two pass intervals in the accurate mode.
- **Keywords** bias recognition but do not guarantee it: compare recall with and without `--keywords`.

The replay runs the exact engine and model revisions the Whistle story pins (`protocol.ts` in plugin-transcription),
cached under `~/.cache/dxos/whistle`; the first run downloads about 18 MB.

Recordings to test against are private fixtures (`private-fixtures` skill), never files in the repo.

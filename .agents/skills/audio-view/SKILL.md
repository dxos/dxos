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

You cannot hear audio, but you can read text and images derived from it. Three scripts in `scripts/` turn a recording
into both; all decode to 16 kHz mono so their times line up. WAV is read natively; other formats need `ffmpeg`.

| Script                                                                                                        | Output                                                                                                                                                                                     | Answers                                                                              |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `describe.mjs <file> [--json]`                                                                                | levels, noise floor, clipping, speech/silence table, a 100 ms loudness strip                                                                                                               | Where are the pauses, how long, how loud is the room?                                |
| `spectrogram.mjs <file> [-o out.png] [--words timeline.jsonl] [--from s --to s]`                              | PNG: time axis, waveform, mel spectrogram (0–8 kHz), speech/silence strip, numbered word spans (legend on stdout)                                                                          | Is there really a gap between two words? Does a word sit on speech, breath or noise? |
| `whistle-replay.mjs <file> [--pass-ms 1000] [--keywords "ECHO, DXOS"] [--reference text] [-o timeline.jsonl]` | every pass (audio time, pass ms, words committed, pending tail), the transcript, per-word confidence, commit lag, words committed in silence; WER and keyword recall against `--reference` | What did Whistle hear, when, and how sure was it?                                    |

Read the PNG with the Read tool after rendering it. A typical loop:

```bash
S=.agents/skills/audio-view/scripts
node $S/describe.mjs rec.wav
node $S/whistle-replay.mjs rec.wav --keywords "ECHO, DXOS" --reference "pull up the echo query framework" -o rec.jsonl
node $S/spectrogram.mjs rec.wav --words rec.jsonl -o rec.png
```

## How to read the results

- **Invented words** ("Thank you.", "you") show up as words committed in silence, or with low `p`.
- **Paragraph splits** in the story need 1.5 s of silence; check `describe`'s timeline for the pause actually there.
- **Commit lag** is how long after a word ends it was committed; roughly two pass intervals in the accurate mode.
- **Keywords** bias recognition but do not guarantee it: compare recall with and without `--keywords`.

The replay runs the exact engine and model revisions the Whistle story pins (`protocol.ts` in plugin-transcription),
cached under `~/.cache/dxos/whistle`; the first run downloads about 18 MB.

Recordings to test against are private fixtures (`private-fixtures` skill), never files in the repo.

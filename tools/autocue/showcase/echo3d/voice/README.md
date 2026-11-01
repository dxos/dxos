# echo3d voice-over

Builds the voiced echo3d videos: the full Fry-style cut (`SAAS.mp4`), the professional cut, and the 45-second SAAS
edit (`SAAS-45.mp4`).

## Rebuild

The chosen takes live on R2 (`takes.json` gives the URL and checksum), and the slide holds they were timed to are
committed as `holds-fry.json` and `holds-pro.json`. A rebuild therefore spends no ElevenLabs credits:

```bash
tools/autocue/showcase/echo3d/voice/build.sh saas45
```

`fry`, `pro` and `saas45` are the three targets. Output lands in `temp/voice/` (or the directory given as the second
argument). The first run downloads the takes, starts `serve.py` on port 7420, and renders the silent 60fps video with
`record.mjs`, which takes a while. Later runs reuse the render in the work directory.

Needs `ffmpeg`, `python3`, `node`, and Playwright's Chromium.

## Steps

| Step                | Script            | Writes                                     |
| ------------------- | ----------------- | ------------------------------------------ |
| Takes, one a slide  | `tts.py`          | `<dir>/<NN>-<slide>.mp3`                   |
| Retry one take      | `tts_one.py`      | one `.mp3`                                 |
| Fit holds to takes  | `fit.py`          | a holds file                               |
| Silent render       | `../record.mjs`   | `echo3d-<set>-video.mp4`                   |
| Voice track         | `mix.py`          | `<dir>/clean/*.wav`, `echo3d-<set>.m4a`    |
| Check take edges    | `audit.py`        | a table; head and tail should be < −45 dB  |
| 45-second edit      | `cut45.py`        | `SAAS-45.mp4`                              |

`audio.py` holds the shared cleaning: each take is cut to its speech (80ms before, 150ms after, so trailing breaths and
clicks fall outside) and levelled to −18 LUFS. Mixes are loudness-normalised in two passes to −16 LUFS, −1.5 dBTP.

## New takes

New takes cost ElevenLabs credits. Ask before generating any.

1. Run `op inject -i ~/.env.tpl -o ~/.env`, then `set -a && . ~/.env && set +a`, which exports `DX_ELEVENLABS_API_KEY`.
2. Generate the set with `tts.py ../SPEAKING-TRACK-FRY.md <dir> jRVXPhztJiPV60oQlVMX`, or retry single lines with
   `tts_one.py`.
3. Run `fit.py <dir> holds-fry.json`, then render, mix and `audit.py` the set.
4. Pack the chosen takes the way `build.sh` expects (`takes/{fry,pro,saas45}/`), upload them with
   `.agents/skills/hosting-artifacts/scripts/upload-artifact.mjs`, and update `takes.json`.

Both voices are stock ElevenLabs library voices, not clones of a real person; `tts.py` refuses a voice whose metadata
names one.

| Set    | Voice                          | Track                            |
| ------ | ------------------------------ | -------------------------------- |
| fry    | Watson `jRVXPhztJiPV60oQlVMX`  | `SPEAKING-TRACK-FRY.md`          |
| pro    | Samara X `19STyYD15bswVz51nqLf` | `SPEAKING-TRACK-PROFESSIONAL.md` |
| saas45 | Watson                         | the lines below                  |

## 45-second script

1. In the beginning, there was SaaS, and it was rather marvellous.
2. But every vendor dug a deep moat.
3. Then came AI, and the frontier labs began swallowing the apps whole.
4. Which is all perfectly fine. Up to a point.
5. Don't panic.
6. D-X-O-S lets you build your own agent-driven apps, without giving your data away.
7. ECHO gives teams private spaces, where people and agents work side by side.
8. This is D-X-O-S. Your team. Your apps. Your data.

Take 8 is the full cut's `company-fills` take. `cut45.py` lists the shots, with source times on the Fry holds; if the
holds change, the shot times move with them.

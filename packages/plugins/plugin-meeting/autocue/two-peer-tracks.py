# /// script
# requires-python = ">=3.10"
# dependencies = ["piper-tts", "pillow"]
# ///
#
# Copyright 2026 DXOS.org
#

"""
Makes the camera and microphone tracks for `two-peer-meeting.mjs`: one WebM per person, all the same length.

Each track is a name card with a live waveform of that person's own voice, and a microphone that speaks only that
person's lines of the script below (Piper text-to-speech, offline). Every track starts with the same silent lead-in,
which `fake-media.mjs` loops until the flow calls `start()`, so both people begin the conversation on one cue.

    uv run packages/plugins/plugin-meeting/autocue/two-peer-tracks.py --out temp/two-peer

Writes `<out>/alice.webm`, `<out>/bob.webm` and `<out>/timeline.json` (each line's speaker, start and text).
Voices download once into `<out>/voices` from the rhasspy/piper-voices repository on Hugging Face.
"""

import argparse
import json
import subprocess
import urllib.request
import wave
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

LEAD_IN = 3.0
GAP = 0.9
TAIL = 12.0
SIZE = (1280, 720)
FONT = '/usr/share/fonts/opentype/inter/Inter-SemiBold.otf'
VOICES = 'https://huggingface.co/rhasspy/piper-voices/resolve/main'

PEOPLE = {
    'alice': {'name': 'Alice', 'voice': 'en/en_US/amy/medium/en_US-amy-medium', 'color': (79, 70, 229)},
    'bob': {'name': 'Bob', 'voice': 'en/en_GB/alan/medium/en_GB-alan-medium', 'color': (13, 148, 136)},
}

SCRIPT = [
    ('alice', 'Hi Bob, thanks for joining. Can you hear me okay?'),
    ('bob', 'Loud and clear, Alice. Your video looks great too.'),
    ('alice', "Great. Let's settle the launch date for the meetings plugin."),
    ('bob', 'I can have the release notes ready by Friday.'),
    ('alice', "Perfect. I'll put that in the meeting notes."),
]


def voice(out: Path, path: str) -> Path:
    """Downloads a Piper voice (model and config) once."""
    model = out / 'voices' / (Path(path).name + '.onnx')
    model.parent.mkdir(parents=True, exist_ok=True)
    for suffix in ('.onnx', '.onnx.json'):
        target = model.with_suffix(suffix) if suffix == '.onnx' else Path(str(model) + '.json')
        if not target.exists():
            urllib.request.urlretrieve(f'{VOICES}/{path}{suffix}', target)
    return model


def speak(model: Path, text: str, target: Path) -> float:
    """Synthesizes one line and returns its length in seconds."""
    subprocess.run(['piper', '-m', str(model), '-f', str(target)], input=text.encode(), check=True, capture_output=True)
    with wave.open(str(target)) as clip:
        return clip.getnframes() / clip.getframerate()


def card(person: dict, target: Path) -> None:
    """A webcam stand-in: the person's initial on a disc in their colour, and their name."""
    image = Image.new('RGB', SIZE, (17, 24, 39))
    draw = ImageDraw.Draw(image)
    center, radius = (SIZE[0] // 2, SIZE[1] // 2 - 60), 150
    draw.ellipse([center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius], fill=person['color'])
    draw.text(center, person['name'][0], font=ImageFont.truetype(FONT, 160), fill='white', anchor='mm')
    draw.text((center[0], center[1] + radius + 70), person['name'], font=ImageFont.truetype(FONT, 56), fill='white', anchor='mm')
    image.save(target)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', default='temp/two-peer')
    out = Path(parser.parse_args().out)
    work = out / 'work'
    work.mkdir(parents=True, exist_ok=True)

    models = {id: voice(out, person['voice']) for id, person in PEOPLE.items()}
    timeline, cursor = [], LEAD_IN
    for index, (speaker, text) in enumerate(SCRIPT):
        clip = work / f'{index:02d}-{speaker}.wav'
        length = speak(models[speaker], text, clip)
        timeline.append({'speaker': speaker, 'start': round(cursor - LEAD_IN, 3), 'end': round(cursor - LEAD_IN + length, 3), 'text': text, 'clip': clip, 'at': cursor})
        cursor += length + GAP
    duration = cursor + TAIL

    for id, person in PEOPLE.items():
        still = work / f'{id}.png'
        card(person, still)
        lines = [line for line in timeline if line['speaker'] == id]
        # Each line is delayed to its place on the shared clock, then mixed onto silence of the full length.
        inputs = ['-f', 'lavfi', '-t', f'{duration}', '-i', 'anullsrc=r=48000:cl=mono']
        mix = []
        for index, line in enumerate(lines):
            inputs += ['-i', str(line['clip'])]
            delay = int(line['at'] * 1000)
            mix.append(f'[{index + 1}:a]aresample=48000,adelay={delay}[a{index}]')
        voices = ''.join(f'[a{index}]' for index in range(len(lines)))
        audio = f'{";".join(mix)};[0:a]{voices}amix=inputs={len(lines) + 1}:normalize=0:duration=first[voice]'
        video = (
            f'[voice]asplit[mic][scope];'
            f'[scope]showwaves=s=640x120:mode=cline:colors=white@0.85:rate=25[waves];'
            f'[{len(lines) + 1}:v]scale={SIZE[0]}:{SIZE[1]},format=yuv420p[bg];'
            f'[bg][waves]overlay=(W-w)/2:H-170:shortest=1[v]'
        )
        subprocess.run(
            ['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-loop', '1', '-framerate', '25', '-t', f'{duration}', '-i', str(still),
             '-filter_complex', f'{audio};{video}', '-map', '[v]', '-map', '[mic]', '-t', f'{duration}',
             '-c:v', 'libvpx-vp9', '-b:v', '600k', '-deadline', 'realtime', '-cpu-used', '8', '-c:a', 'libopus', '-b:a', '64k',
             str(out / f'{id}.webm')],
            check=True,
        )

    lines = [{key: line[key] for key in ('speaker', 'start', 'end', 'text')} for line in timeline]
    (out / 'timeline.json').write_text(json.dumps({'leadIn': LEAD_IN, 'duration': round(duration - LEAD_IN, 3), 'lines': lines}, indent=2) + '\n')
    print(json.dumps({'tracks': [str(out / f'{id}.webm') for id in PEOPLE], 'lines': len(lines), 'seconds': round(duration, 1)}))


if __name__ == '__main__':
    main()

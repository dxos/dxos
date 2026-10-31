#
# Copyright 2026 DXOS.org
#

# Generates one ElevenLabs take per slide from a speaking track.
# Usage: python3 tts.py <SPEAKING-TRACK.md> <out dir> <voice id>
# Writes <out dir>/<NN>-<slide id>.mp3; needs DX_ELEVENLABS_API_KEY. Each call spends ElevenLabs credits.

import json
import os
import re
import sys
import urllib.request

track, out_dir, voice = sys.argv[1], sys.argv[2], sys.argv[3]
key = os.environ['DX_ELEVENLABS_API_KEY']
api = 'https://api.elevenlabs.io/v1'


def call(path, body=None):
    request = urllib.request.Request(api + path, data=json.dumps(body).encode() if body else None,
                                     headers={'xi-api-key': key, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read()


matches = json.loads(call(f'/shared-voices?page_size=5&search={voice}')).get('voices', [])
info = next((v for v in matches if v.get('voice_id') == voice), {})
print('voice:', info.get('name'), '|', info.get('accent'), '|', (info.get('description') or '')[:200])
# The track is written in a style, never voiced by a clone of a real person.
if not info or 'fry' in json.dumps(info).lower():
    sys.exit('ABORT: voice is not a library voice, or its metadata names a real person; not generating.')

text = open(track).read().split('## Timing')[0]
slides = []
for number, slide, body in re.findall(r'\n## (\d+)\. [^\n]*?\(`#([\w-]+)`\)\n(.*?)(?=\n## |\Z)', text, re.S):
    lines = [re.sub(r'\s+', ' ', re.sub(r'_\(.*?\)_', '', line[2:])).strip()
             for line in body.split('\n') if line.startswith('- ')]
    spoken = ' '.join(line for line in lines if line).replace('DXOS', 'D-X-O-S')
    if spoken:
        slides.append((int(number), slide, spoken))

os.makedirs(out_dir, exist_ok=True)
for index, (number, slide, spoken) in enumerate(slides):
    body = {
        'text': spoken,
        'model_id': 'eleven_multilingual_v2',
        'previous_text': slides[index - 1][2] if index else None,
        'next_text': slides[index + 1][2] if index + 1 < len(slides) else None,
    }
    audio = call(f'/text-to-speech/{voice}?output_format=mp3_44100_128', body)
    path = os.path.join(out_dir, f'{number:02d}-{slide}.mp3')
    open(path, 'wb').write(audio)
    print('wrote', path, len(audio))

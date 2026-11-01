#
# Copyright 2026 DXOS.org
#

# Regenerates a single take, e.g. to retry one line.
# Usage: python3 tts_one.py <voice id> <out.mp3> <text> [previous text] [stability style]
# A leading '<break time="0.2s" />' in the text keeps the first word from being clipped.

import json
import os
import sys
import urllib.request

voice, out, text = sys.argv[1], sys.argv[2], sys.argv[3]
previous = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] else None
body = {'text': text, 'model_id': 'eleven_multilingual_v2', 'previous_text': previous}
if len(sys.argv) > 6:
    body['voice_settings'] = {'stability': float(sys.argv[5]), 'similarity_boost': 0.75, 'style': float(sys.argv[6]),
                              'use_speaker_boost': True}
request = urllib.request.Request(
    f'https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128',
    data=json.dumps(body).encode(),
    headers={'xi-api-key': os.environ['DX_ELEVENLABS_API_KEY'], 'Content-Type': 'application/json'})
with urllib.request.urlopen(request, timeout=120) as response:
    open(out, 'wb').write(response.read())
print('wrote', out)

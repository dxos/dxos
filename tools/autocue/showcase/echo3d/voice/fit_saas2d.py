#
# Copyright 2026 DXOS.org
#

# Fits the Saas2D scene holds to a set of takes: each scene lasts as long as its take plus a short breath, but never
# less than its motion needs to read.
# Usage: python3 fit_saas2d.py <take dir> <out holds.json>

import glob
import json
import math
import os
import sys

from audio import clean

takes, out = sys.argv[1], sys.argv[2]
ORDER = ['blank', 'beginning', 'silo', 'silo-comms', 'scale', 'competitors', 'spread', 'spread-comms', 'frontier',
         'frontier-comms', 'orbit', 'absorb', 'rivals', 'merge-1', 'final-frontier', 'engulf', 'dont-panic',
         'spread-again', 'echo-hub', 'echo-spaces', 'objects', 'object-created', 'echo-spaces-again', 'echo-hub-again',
         'saas-merge', 'company-fills']
# The shortest each scene can play in before its motion reads as rushed.
SHORTEST = {'blank': 0.5, 'final-frontier': 2.5, 'frontier-comms': 6.5, 'absorb': 5.5, 'merge-1': 6.0,
            'saas-merge': 5.0, 'company-fills': 10.0}
# Where each take starts in its scene, and the silence after it before the next scene.
LEAD, BREATH = 0.2, 0.3
# The closing take starts as the logo lands, and the frame holds after the last word.
ANCHORS = {'company-fills': 3.4}
CLOSE = 2.0

clips = {os.path.basename(path)[3:-4]: path for path in glob.glob(f'{takes}/*.mp3')}
os.makedirs(f'{takes}/clean', exist_ok=True)
holds = {}
for scene in ORDER:
    hold = SHORTEST.get(scene, 2.0)
    if scene in clips:
        length = clean(clips[scene], f'{takes}/clean/{scene}.wav')
        tail = CLOSE if scene == ORDER[-1] else BREATH
        hold = max(hold, math.ceil((ANCHORS.get(scene, LEAD) + length + tail) * 10) / 10)
    holds[scene] = hold
json.dump(holds, open(out, 'w'), indent=2)
total = sum(holds.values())
print('total', f'{int(total // 60)}:{total % 60:04.1f}')

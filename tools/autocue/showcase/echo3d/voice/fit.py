#
# Copyright 2026 DXOS.org
#

# Lengthens each slide's hold so its take fits, with 0.8s to spare, rounded up to half a second.
# Usage: python3 fit.py <take dir> <out holds.json>
# Starts from record.mjs's HOLDS; only needed after new takes, since holds-*.json record the holds in use.

import glob
import json
import math
import os
import re
import sys

from audio import duration

takes, out = sys.argv[1], sys.argv[2]
source = open(os.path.join(os.path.dirname(__file__), '..', 'record.mjs')).read()
order = re.findall(r"\n  '([\w-]+)': ([\d.]+),", source.split('const HOLDS')[1].split('};')[0])
clips = {os.path.basename(path)[3:-4]: path for path in glob.glob(f'{takes}/*.mp3')}
holds = {}
for slide, hold in order:
    hold = float(hold)
    if slide in clips:
        hold = max(hold, math.ceil((duration(clips[slide]) + 0.8) * 2) / 2)
    holds[slide] = hold
json.dump(holds, open(out, 'w'), indent=2)
total = sum(holds.values())
print('total', f'{int(total // 60)}:{total % 60:04.1f}', 'changed', sum(1 for k, v in order if holds[k] != float(v)))

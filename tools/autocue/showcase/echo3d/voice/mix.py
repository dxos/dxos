#
# Copyright 2026 DXOS.org
#

# Lays the cleaned takes onto the slide timeline from a holds file and writes the voice track.
# Usage: python3 mix.py <take dir> <holds.json> <video.mp4> <out.m4a>
# Cleaned takes go to <take dir>/clean/.

import glob
import json
import os
import sys

from audio import clean, duration, loudnorm, run

takes, holds_file, video, out = sys.argv[1:5]
# Where a take must start or end, in seconds from its slide's start, measured on the picture.
ANCHORS = {'engulf': ('end', 7.5), 'dont-panic': ('start', 2.5), 'company-fills': ('start', 3.0)}
# Shortest silence between two takes.
GAP = 0.35

holds = json.load(open(holds_file))
clips = {os.path.basename(path)[3:-4]: path for path in glob.glob(f'{takes}/*.mp3')}
os.makedirs(f'{takes}/clean', exist_ok=True)

at_slide, schedule, previous_end = 0, [], 0
for slide, hold in holds.items():
    if slide in clips:
        cleaned = f'{takes}/clean/{slide}.wav'
        length = clean(clips[slide], cleaned)
        kind, offset = ANCHORS.get(slide, ('start', 0.5))
        want = at_slide + offset - (length if kind == 'end' else 0)
        at = max(want, previous_end + GAP)
        schedule.append((slide, cleaned, at, length, at - want))
        previous_end = at + length
    at_slide += hold

total = max(duration(video), previous_end + 1.0)
inputs, filters = [], []
for k, (slide, cleaned, at, length, drift) in enumerate(schedule):
    inputs += ['-i', cleaned]
    ms = int(at * 1000)
    filters.append(f'[{k}:a]adelay={ms}|{ms}[a{k}]')
streams = ''.join(f'[a{k}]' for k in range(len(schedule)))
graph = ';'.join(filters) + f';{streams}amix=inputs={len(schedule)}:normalize=0,apad=whole_dur={total}'
run('ffmpeg', '-y', '-v', 'error', *inputs, '-filter_complex', f'{graph},{loudnorm(inputs, graph)},aresample=48000[out]',
    '-map', '[out]', '-c:a', 'aac', '-b:a', '192k', out)
for slide, cleaned, at, length, drift in schedule:
    if drift > 0.01 or slide in ANCHORS:
        print(f'  {slide:18} at {at:6.2f} len {length:5.2f} ends {at + length:6.2f}'
              + (f'  late by {drift:.2f}' if drift > 0.01 else ''))
print('audio', round(total, 2), 'video', duration(video))

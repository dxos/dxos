#
# Copyright 2026 DXOS.org
#

# Checks each cleaned take's edges for clipped speech or a breath left in: head and tail should sit below -45 dB.
# Usage: python3 audit.py <take dir> [mix.m4a]

import glob
import os
import re
import subprocess
import sys

from audio import duration

takes = sys.argv[1]


def stats(path, trim=''):
    log = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-af',
                          (trim + ',' if trim else '')
                          + 'astats=measure_overall=Peak_level+Number_of_samples+RMS_level:measure_perchannel=none',
                          '-f', 'null', '-'], capture_output=True, text=True).stderr
    peak = re.findall(r'Peak level dB: (-?[\d.inf]+)', log)
    rms = re.findall(r'RMS level dB: (-?[\d.inf]+)', log)
    return (peak[-1] if peak else '?'), (rms[-1] if rms else '?')


print(f"{'clip':24} {'srcPeak':>7} {'head30ms':>8} {'endRMS':>7} {'last80ms':>8}")
for path in sorted(glob.glob(f'{takes}/*.mp3')):
    slide = os.path.basename(path)[3:-4]
    cleaned = f'{takes}/clean/{slide}.wav'
    peak, _ = stats(path)
    if not os.path.exists(cleaned):
        print(slide, 'no clean')
        continue
    length = duration(cleaned)
    _, head = stats(cleaned, 'atrim=0:0.03')
    _, end_speech = stats(cleaned, f'atrim={max(0, length - 0.45)}:{length - 0.25}')
    _, last = stats(cleaned, f'atrim={length - 0.08}:{length}')
    print(f'{slide:24} {peak:>7} {head:>8} {end_speech:>7} {last:>8}')
if len(sys.argv) > 2:
    print('mix', stats(sys.argv[2]))

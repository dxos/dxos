#
# Copyright 2026 DXOS.org
#

# Cuts the 45-second SAAS edit from the silent Fry render and lays its eight takes on it.
# Usage: python3 cut45.py <echo3d-fry-video.mp4> <take dir with 1.wav … 8.wav> <out.mp4>

import subprocess
import sys

from audio import loudnorm

source, takes, out = sys.argv[1:4]
# (source start, duration, take or None, take offset within the shot); the source times are on the Fry holds.
SHOTS = [
    (2.3, 4.7, '1', 0.7),  # beginning: the title fades in at 3.0
    (27.0, 4.0, '2', 0.5),  # competitors
    (56.5, 6.3, '3', 0.4),  # frontier-comms
    (113.5, 6.5, '4', 0.5),  # engulf: the line ends as Welcome appears at 117.0
    (122.0, 4.2, '5', 2.0),  # dont-panic: the caption fades in at 124.0
    (131.5, 6.8, '6', 0.4),  # echo-hub
    (141.0, 3.1, '7', 0.4),  # echo-spaces, until "where people and agents"
    (170.0, 3.6, None, 0),  # object-thread
    (223.5, 8.5, '8', 1.5),  # company-fills: the logo comes up at 225.2
]
FADE = 0.3

inputs, video, at, voices = [], [], 0.0, []
for k, (start, length, take, offset) in enumerate(SHOTS):
    inputs += ['-ss', f'{start}', '-t', f'{length}', '-i', source]
    video.append(f'[{k}:v]setpts=PTS-STARTPTS,fps=60[v{k}]')
    if take:
        voices.append((f'{takes}/{take}.wav', at + offset))
    at += length - FADE
total = at + FADE
last, offset = 'v0', 0.0
for k in range(1, len(SHOTS)):
    offset += SHOTS[k - 1][1] - FADE
    video.append(f'[{last}][v{k}]xfade=transition=fade:duration={FADE}:offset={offset:.3f}[x{k}]')
    last = f'x{k}'

audio = []
for j, (path, when) in enumerate(voices):
    inputs += ['-i', path]
    ms = int(when * 1000)
    audio.append(f'[{len(SHOTS) + j}:a]adelay={ms}|{ms}[a{j}]')
mix = (''.join(f'[a{j}]' for j in range(len(voices)))
       + f'amix=inputs={len(voices)}:normalize=0,apad=whole_dur={total:.3f}')
level = loudnorm(inputs, ';'.join(audio) + ';' + mix)
subprocess.run(['ffmpeg', '-y', '-v', 'error', *inputs, '-filter_complex',
                f"{';'.join(video + audio)};{mix},{level},aresample=48000[aout]",
                '-map', f'[{last}]', '-map', '[aout]', '-t', f'{total:.3f}', '-c:v', 'libx264', '-crf', '18',
                '-preset', 'medium', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
                out], check=True)
print(f'total {total:.2f}s')

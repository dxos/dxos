#
# Copyright 2026 DXOS.org
#

# Shared helpers: find the speech in a take, trim it to that, and level it.

import array
import json
import math
import re
import subprocess


def run(*args):
    return subprocess.run(args, capture_output=True, text=True, check=True)


def duration(path):
    return float(run('ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path).stdout)


def envelope(src):
    """10ms RMS levels in dBFS, from the clip decoded to 16kHz mono."""
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-f', 's16le', '-ac', '1', '-ar', '16000', '-'],
                         capture_output=True, check=True).stdout
    samples = array.array('h', pcm)
    size = 160
    levels = []
    for i in range(0, len(samples) - size + 1, size):
        window = samples[i:i + size]
        power = sum(x * x for x in window) / size
        levels.append(10 * math.log10(power / 32768**2) if power else -120)
    return levels


def speech(levels, threshold=-35, gap=20, shortest=12):
    """First and one-past-last 10ms frame of speech.

    Frames above the threshold are merged across gaps under 0.2s; a stretch under 0.12s at either end is a breath or a
    click, not speech, and is dropped.
    """
    runs = []
    for i, level in enumerate(levels):
        if level > threshold:
            if runs and i - runs[-1][1] <= gap:
                runs[-1][1] = i + 1
            else:
                runs.append([i, i + 1])
    while len(runs) > 1 and runs[-1][1] - runs[-1][0] < shortest:
        runs.pop()
    while len(runs) > 1 and runs[0][1] - runs[0][0] < shortest:
        runs.pop(0)
    return runs[0][0], runs[-1][1]


def clean(src, dst):
    """Trims a take to its speech and levels it to -18 LUFS; returns the cleaned length in seconds.

    The cut keeps 80ms before the speech and 150ms after, so the breath a voice takes after its line, and any click,
    falls outside.
    """
    total = duration(src)
    first, last = speech(envelope(src))
    head = max(0, first * 0.01 - 0.08)
    tail = min(total, last * 0.01 + 0.15)
    length = tail - head
    measured = run('ffmpeg', '-hide_banner', '-i', src, '-af', f'atrim={head}:{tail},ebur128', '-f', 'null', '-').stderr
    level = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', measured)[-1])
    run('ffmpeg', '-y', '-v', 'error', '-i', src, '-af',
        f'atrim={head}:{tail},asetpts=N/SR/TB,volume={-18 - level:.2f}dB,'
        f'afade=t=in:d=0.01,afade=t=out:st={length - 0.08:.3f}:d=0.08',
        '-ar', '48000', '-ac', '1', dst)
    return length


def loudnorm(inputs, graph):
    """The second-pass (linear) loudnorm filter for a mix, measured from a first pass, at -16 LUFS / -1.5 dBTP."""
    target = 'loudnorm=I=-16:TP=-1.5:LRA=11'
    measured = run('ffmpeg', '-hide_banner', *inputs, '-filter_complex', f'{graph},{target}:print_format=json',
                   '-f', 'null', '-').stderr
    stats = json.loads(measured[measured.rindex('{'):measured.rindex('}') + 1])
    return (f"{target}:linear=true:measured_I={stats['input_i']}:measured_TP={stats['input_tp']}"
            f":measured_LRA={stats['input_lra']}:measured_thresh={stats['input_thresh']}:offset={stats['target_offset']}")

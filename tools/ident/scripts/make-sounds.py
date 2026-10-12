"""Generate placeholder sounds into public/audio/.

pulse.wav       a short low thump, played under each word
sonic-logo.wav  a soft chord with three bell notes, played on the end card

Replace these files with the real sonic logo when it exists (keep the names).
Needs numpy:  pip install numpy
"""
import os
import wave

import numpy as np

SR = 48000
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'audio')


def note(freq, dur, attack=0.005, decay=None, harmonics=(1.0,), detune=0.0):
    t = np.arange(int(SR * dur)) / SR
    sig = sum(a * np.sin(2 * np.pi * freq * (i + 1) * (1 + detune * i) * t) for i, a in enumerate(harmonics))
    env = np.minimum(1, t / attack)
    env *= np.exp(-t / (decay or dur / 4))
    return sig * env


def hz(name):
    names = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
    pitch, octave = name[:-1], int(name[-1])
    semis = names[pitch[0]] + (1 if '#' in pitch else 0)
    return 440 * 2 ** ((semis - 9) / 12 + (octave - 4))


def mix(length, parts):
    buf = np.zeros(int(SR * length))
    for start, sig in parts:
        s = int(SR * start)
        e = min(len(buf), s + len(sig))
        buf[s:e] += sig[: e - s]
    return buf


def write(name, sig, gain_db=-3):
    sig = sig / (np.max(np.abs(sig)) or 1) * 10 ** (gain_db / 20)
    data = (sig * 32767).astype(np.int16)
    stereo = np.column_stack([data, data]).ravel()
    path = os.path.join(OUT, name)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(stereo.tobytes())
    print('wrote', os.path.relpath(path))


os.makedirs(OUT, exist_ok=True)

# Pulse: a low D with a quick pitch drop, like a soft kick.
t = np.arange(int(SR * 0.45)) / SR
f = hz('D1') * (1 + 1.5 * np.exp(-t / 0.02))
pulse = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.09) * np.minimum(1, t / 0.003)
write('pulse.wav', pulse, gain_db=-4)

# Sonic logo: Dmaj(add9) chord on an electric-piano-ish tone, a low thump, three bell notes.
ep = (1.0, 0.35, 0.12)
chord = sum(note(hz(n), 3.0, attack=0.01, decay=1.1, harmonics=ep) * 0.5 for n in ['D3', 'A3', 'E4', 'F#4'])
bells = [(0.0, 'A4'), (0.22, 'E5'), (0.44, 'F#5')]
parts = [(0.0, chord), (0.0, pulse * 1.4)]
parts += [(s, note(hz(n), 2.4, attack=0.002, decay=0.7, harmonics=(1.0, 0.0, 0.25, 0.0, 0.08)) * 0.45) for s, n in bells]
logo = mix(3.2, parts)
fade = np.ones_like(logo)
fade[-int(SR * 0.6):] = np.linspace(1, 0, int(SR * 0.6))
write('sonic-logo.wav', logo * fade, gain_db=-3)

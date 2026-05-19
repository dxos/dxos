//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { formatLeadSheet, formatPitch, formatPosition, parseLeadSheet, parsePitch, parsePosition } from './lead-sheet';

describe('parsePitch', () => {
  test('middle C and sharps/flats', ({ expect }) => {
    expect(parsePitch('C4')).toBe(60);
    expect(parsePitch('C#4')).toBe(61);
    expect(parsePitch('Db4')).toBe(61);
    expect(parsePitch('F5')).toBe(77);
    expect(parsePitch('Ab5')).toBe(80);
    expect(parsePitch('A0')).toBe(21);
  });

  test('rejects garbage', ({ expect }) => {
    expect(() => parsePitch('H4')).toThrow();
    expect(() => parsePitch('C')).toThrow();
  });
});

describe('formatPitch', () => {
  test('round-trips with parsePitch', ({ expect }) => {
    for (const midi of [21, 36, 60, 61, 77, 80, 108]) {
      expect(parsePitch(formatPitch(midi))).toBe(midi);
    }
  });
});

describe('parsePosition', () => {
  test('bar.beat in 4/4', ({ expect }) => {
    expect(parsePosition('1.1')).toBe(0);
    expect(parsePosition('1.2')).toBe(1);
    expect(parsePosition('1.3')).toBe(2);
    expect(parsePosition('2.1')).toBe(4);
  });

  test('fractional sub-beat', ({ expect }) => {
    expect(parsePosition('1.1.5')).toBe(0.5);
    expect(parsePosition('1.2.25')).toBe(1.25);
  });

  test('respects beatsPerBar', ({ expect }) => {
    expect(parsePosition('2.1', 3)).toBe(3);
  });
});

describe('formatPosition', () => {
  test('round-trips with parsePosition', ({ expect }) => {
    for (const input of ['1.1', '1.2', '1.3', '2.1', '1.1.5', '1.2.25']) {
      expect(formatPosition(parsePosition(input))).toBe(input);
    }
  });
});

describe('parseLeadSheet', () => {
  test('multi-track with chords and drums', ({ expect }) => {
    const doc = parseLeadSheet(`
[1:Piano]
1.1 F5/8 Ab5/8
1.2 C6/4
1.3 F5/8 C6/8

[2:Bass]
1.1 F2/2
1.3 Db2/2

[3:Drums]
1.1 Kick
1.2 Hat
1.2.5 Snare
`);
    expect(doc.tracks).toHaveLength(3);

    const [piano, bass, drums] = doc.tracks;
    expect(piano).toMatchObject({ index: 1, name: 'Piano' });
    expect(piano.notes).toHaveLength(5);
    expect(piano.notes[0]).toEqual({ pitch: 77, startTime: 0, duration: 0.5 });
    expect(piano.notes[1]).toEqual({ pitch: 80, startTime: 0, duration: 0.5 });
    expect(piano.notes[2]).toEqual({ pitch: 84, startTime: 1, duration: 1 });

    expect(bass).toMatchObject({ index: 2, name: 'Bass' });
    expect(bass.notes).toEqual([
      { pitch: 41, startTime: 0, duration: 2 }, // F2
      { pitch: 37, startTime: 2, duration: 2 }, // Db2 (= C#2 enharmonic)
    ]);

    expect(drums).toMatchObject({ index: 3, name: 'Drums', instrument: 'drums' });
    expect(drums.notes).toEqual([
      { pitch: 36, startTime: 0, duration: 0.25 }, // Kick
      { pitch: 42, startTime: 1, duration: 0.25 }, // Hat
      { pitch: 38, startTime: 1.5, duration: 0.25 }, // Snare
    ]);
  });

  test('ignores blanks and comments', ({ expect }) => {
    const doc = parseLeadSheet(`# leading comment
[1:Test]
1.1 C4/4   # inline comment
# blank below

1.2 D4/4
`);
    expect(doc.tracks[0].notes).toHaveLength(2);
  });

  test('rounds length up to next bar', ({ expect }) => {
    const doc = parseLeadSheet('[1:T]\n1.1 C4/4\n1.4 C4/4');
    expect(doc.tracks[0].length).toBe(4);
  });

  test('multiple position groups on one line', ({ expect }) => {
    // The Children riff sheet packs whole bars onto a single line:
    //   1.1 F#5/4   1.2 A5/4   1.3 C#6/2
    const doc = parseLeadSheet('[1:Lead]\n1.1 F#5/4   1.2 A5/4   1.3 C#6/2');
    expect(doc.tracks[0].notes).toEqual([
      { pitch: 78, startTime: 0, duration: 1 },
      { pitch: 81, startTime: 1, duration: 1 },
      { pitch: 85, startTime: 2, duration: 2 },
    ]);
  });

  test('rejects a position with no events', ({ expect }) => {
    expect(() => parseLeadSheet('[1:T]\n1.1 C4/4 1.2')).toThrow();
  });
});

describe('formatLeadSheet', () => {
  test('round-trips the example', ({ expect }) => {
    const source = `[1:Piano]
1.1 F5/8 Ab5/8
1.2 C6/4
1.3 F5/8 C6/8

[2:Bass]
1.1 F2/2
1.3 Db2/2

[3:Drums]
1.1 Kick
1.2 Hat
1.2.5 Snare`;
    const formatted = formatLeadSheet(parseLeadSheet(source));
    // Notes round-trip but accidentals normalize to sharps (the MIDI pitch is the
    // source of truth; the formatter has no record of the input spelling).
    // Drum events without explicit duration default to 1/16.
    expect(formatted).toContain('[1:Piano]');
    expect(formatted).toContain('1.1 F5/8 G#5/8'); // Ab5 → G#5
    expect(formatted).toContain('1.2 C6/4');
    expect(formatted).toContain('[2:Bass]');
    expect(formatted).toContain('1.1 F2/2');
    expect(formatted).toContain('1.3 C#2/2'); // Db2 → C#2
    expect(formatted).toContain('[3:Drums]');
    expect(formatted).toContain('1.1 Kick/16');
    expect(formatted).toContain('1.2.5 Snare/16');
  });
});

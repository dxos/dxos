//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import type * as Terminal from 'effect/Terminal';

type KeyOptions = {
  input?: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
};

const makeInput = (
  name: string,
  { input, ctrl = false, meta = false, shift = false }: KeyOptions = {},
): Terminal.UserInput => ({
  input: Option.fromNullishOr(input),
  key: { name, ctrl, meta, shift },
});

/**
 * Control characters that name a key directly rather than resolving to a ctrl-modified letter.
 */
const CONTROL_KEYS: Record<string, string> = {
  '\r': 'return',
  '\n': 'return',
  '\t': 'tab',
  '\b': 'backspace',
  '\x7f': 'backspace',
};

/**
 * CSI/SS3 sequences (minus the leading escape) emitted by xterm for navigation keys.
 * Ordered longest-first so `[3~` is matched before a shorter entry sharing its prefix.
 */
const ESCAPE_SEQUENCES: ReadonlyArray<readonly [string, string]> = [
  ['[1~', 'home'],
  ['[3~', 'delete'],
  ['[4~', 'end'],
  ['[5~', 'pageup'],
  ['[6~', 'pagedown'],
  ['[A', 'up'],
  ['[B', 'down'],
  ['[C', 'right'],
  ['[D', 'left'],
  ['[F', 'end'],
  ['[H', 'home'],
  ['OA', 'up'],
  ['OB', 'down'],
  ['OC', 'right'],
  ['OD', 'left'],
];

const matchEscapeSequence = (data: string, index: number): { name: string; length: number } | undefined => {
  for (const [sequence, name] of ESCAPE_SEQUENCES) {
    if (data.startsWith(sequence, index)) {
      return { name, length: sequence.length };
    }
  }

  return undefined;
};

/**
 * Length of the unrecognized escape sequence at `index`, or zero if what follows is not one.
 *
 * The table above covers only unmodified navigation keys, so a chord like ctrl-right arrives as
 * the parameterized `\x1b[1;5C` and matches nothing. Measuring the whole sequence lets the caller
 * discard it; decoding it byte by byte would type `1;5C` into the line instead.
 */
const unrecognizedEscapeLength = (data: string, index: number): number => {
  const introducer = data[index];
  if (introducer === '[') {
    // CSI: parameter and intermediate bytes up to a final byte in `@`–`~`.
    let end = index + 1;
    while (end < data.length && !(data[end] >= '@' && data[end] <= '~')) {
      end += 1;
    }

    return end < data.length ? end - index + 1 : data.length - index;
  }

  // SS3: a single final byte follows the introducer.
  if (introducer === 'O' && index + 1 < data.length) {
    return 2;
  }

  return 0;
};

/**
 * Decodes a chunk of xterm `onData` output into the keypress events that Effect's `Terminal`
 * consumers (notably `@effect/cli` prompts) expect, using the same key names as Node's readline.
 *
 * Decoding the raw data stream rather than `onKey` DOM events is what makes paste work: a pasted
 * string arrives as one chunk and expands to one event per character.
 */
export const decodeInput = (data: string): Terminal.UserInput[] => {
  const inputs: Terminal.UserInput[] = [];
  let index = 0;

  while (index < data.length) {
    const char = data[index];

    if (char === '\x1b') {
      const escape = matchEscapeSequence(data, index + 1);
      if (escape) {
        inputs.push(makeInput(escape.name));
        index += escape.length + 1;
        continue;
      }

      const unrecognized = unrecognizedEscapeLength(data, index + 1);
      if (unrecognized > 0) {
        index += unrecognized + 1;
        continue;
      }

      // A lone escape followed by a printable character is how alt-modified keys arrive.
      const next = data[index + 1];
      if (next !== undefined && next >= ' ' && next !== '\x7f') {
        inputs.push(makeInput(next.toLowerCase(), { input: next, meta: true }));
        index += 2;
        continue;
      }

      inputs.push(makeInput('escape'));
      index += 1;
      continue;
    }

    const control = CONTROL_KEYS[char];
    if (control) {
      inputs.push(makeInput(control));
      index += 1;
      continue;
    }

    const code = char.charCodeAt(0);
    if (code < 0x20) {
      inputs.push(makeInput(String.fromCharCode(code + 0x60), { ctrl: true }));
      index += 1;
      continue;
    }

    const lower = char.toLowerCase();
    inputs.push(
      makeInput(char === ' ' ? 'space' : lower, {
        input: char,
        shift: char !== lower,
      }),
    );
    index += 1;
  }

  return inputs;
};

/**
 * Ctrl-C and Ctrl-D end an input stream, matching the platform-node default.
 */
export const isQuitInput = (input: Terminal.UserInput): boolean =>
  input.key.ctrl && (input.key.name === 'c' || input.key.name === 'd');

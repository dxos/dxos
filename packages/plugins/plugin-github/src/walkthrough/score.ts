//
// Copyright 2026 DXOS.org
//

import { isGeneratedFile } from './generated.ts';
import { type PatchFile, parsePatch } from './patch.ts';

/**
 * One graded dimension.
 *
 * `evidence` carries the offending excerpts rather than a count alone, because a score a human
 * cannot attribute to a line is a number nobody acts on.
 */
export type Dimension = {
  name: string;
  /** Clamped to [0, 1]; 1 is the behaviour the prompt asks for. */
  score: number;
  /** What the score was computed over, so a 0.9 on a two-sentence body is not read as a pass. */
  sampled: number;
  evidence: string[];
};

export type WalkthroughScore = {
  correctness: Dimension[];
  readability: Dimension[];
};

/** Words that mark generated prose rather than writing; see `.agents/skills/readable-prose`. */
export const SLOP_WORDS = [
  'additionally',
  'crucial',
  'delve',
  'enduring',
  'enhance',
  'fostering',
  'garner',
  'groundbreaking',
  'interplay',
  'intricate',
  'leverage',
  'pivotal',
  'robust',
  'seamless',
  'showcase',
  'tapestry',
  'testament',
  'underscore',
  'utilize',
  'vibrant',
];

/** Fancy ways to say "is" or "has", which cost a reader a beat and say nothing. */
export const SLOP_PHRASES = [
  'serves as',
  'stands as',
  'boasts',
  'it is important to note',
  'in order to',
  'due to the fact that',
  'not just',
  'a wide range of',
  'plays a key role',
];

/** Sentences longer than this force the reader to backtrack, so they are graded against. */
const MAX_SENTENCE_WORDS = 30;

/** A fence is worth roughly a paragraph; far less prose than this is a diff dump with headings. */
const MIN_WORDS_PER_FENCE = 25;

const clamp = (value: number): number => Math.min(1, Math.max(0, value));

/** A ratio over nothing is a pass by default, which would score an empty body perfect. */
const ratio = (good: number, total: number): number => (total === 0 ? 1 : clamp(good / total));

/** Body with every fenced block removed, so prose metrics never grade the diff itself. */
/**
 * The document without its appendix.
 *
 * `fillWalkthrough` appends every unclaimed hunk under `## Also changed`, so a stored walkthrough
 * contains a fence for every hunk in the patch. Counting those would score full coverage for a
 * document that described nothing.
 */
export const withoutAppendix = (body: string): string => body.split(/^## Also changed\s*$/m)[0];

/**
 * A fenced block: opener, info line, body, and a closer of at least as many of the same marker with
 * nothing but whitespace after it. Shared by {@link proseOf} and the fence reader so the two never
 * disagree about where a block ends — ` ```text ` opens a block, it does not close one.
 */
const FENCE = /^( {0,3})(`{3,}|~{3,})([^\n]*)\n([\s\S]*?)^[ \t]*\2\2*[ \t]*$/gm;

export const proseOf = (body: string): string => body.replace(new RegExp(FENCE.source, 'gm'), '');

const sentencesOf = (prose: string): string[] =>
  prose
    .replace(/^#+ .*$/gm, '') // Headings are not sentences and are allowed to be fragments.
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

const wordsOf = (text: string): string[] => text.split(/\s+/).filter((word) => /[a-z]/i.test(word));

/**
 * Fences the model emitted, by path — the same shape {@link fillWalkthrough} reads, parsed again
 * here so scoring an already-filled body and scoring raw model output give the same answer.
 */
const fencesOf = (body: string): { file?: string; lines?: string; empty: boolean; contents: string }[] => {
  const pattern = new RegExp(FENCE.source, 'gm');
  const fences: { file?: string; lines?: string; empty: boolean; contents: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body))) {
    const [, , , info, contents] = match;
    if (!/^[ \t]*diff\b/.test(info)) {
      continue;
    }
    const file = info.match(/\bfile=(?:"([^"]*)"|'([^']*)'|(\S+))/);
    fences.push({
      file: file?.[1] ?? file?.[2] ?? file?.[3],
      lines: info.match(/\blines=(\S+)/)?.[1],
      empty: contents.trim().length === 0,
      contents,
    });
  }

  return fences;
};

/**
 * A `lines=` that names no hunk of the file it points at: inverted (`394-224`), or simply wrong.
 *
 * {@link fillWalkthrough} falls back to the whole file rather than emitting an empty chunk, so the
 * reader sees code and never learns the prose was pointing somewhere else. Only the score says so.
 */
const badRanges = (
  fences: { file?: string; lines?: string }[],
  files: Map<string, { hunks: { afterStart: number; afterEnd: number }[] }>,
): string[] =>
  fences.flatMap((fence) => {
    const { file: path, lines } = fence;
    const file = path ? files.get(path) : undefined;
    if (!file || !lines) {
      return [];
    }
    const named = `${path} lines=${lines}`;
    const range = lines.match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
    if (!range) {
      return [named];
    }
    const start = Number(range[1]);
    const end = range[2] === undefined ? start : Number(range[2]);
    const hit = end >= start && file.hunks.some((hunk) => hunk.afterStart <= end && hunk.afterEnd >= start);
    return hit ? [] : [named];
  });

/**
 * Inline-code tokens in the prose that name something in the code: a path, an identifier, a
 * constant. Grounding them in the patch is the cheapest hallucination check there is — a
 * walkthrough that cites a symbol the change never touches is wrong in the way reviewers hate most.
 */
const citationsOf = (prose: string): string[] => {
  const cited = [...prose.matchAll(/`([^`\n]{2,80})`/g)].map((match) => match[1].trim());
  // A prose word in backticks (`force`, `null`) is not a citation to check; a path, a call or a
  // multi-word identifier is.
  return cited.filter((token) => /[./]|[a-z][A-Z]|_|\(\)/.test(token));
};

/**
 * Numbers the prose asserts: a timeout, an interval, a count. Each one is a factual claim about the
 * system, and a model with no source for it invents a plausible value — the failure a reviewer is
 * least able to catch, because the number reads as evidence.
 */
const numbersOf = (prose: string): string[] =>
  [...prose.replace(/`[^`\n]*`/g, '').matchAll(/(?<![\w.#])\d[\d_,.]*/g)]
    // A sentence-final digit takes the full stop with it, and "5." grounds against nothing.
    .map((match) => match[0].replace(/[.,]+$/, ''));

/**
 * Numeric literals the patch contains, separators stripped and scaled by a thousand both ways.
 *
 * A constant reads `10_000` in the code and "10 seconds" in the prose, so a plain substring test
 * calls a grounded number invented — which is the worst way for this dimension to be wrong, because
 * it teaches the model to drop the detail that made the walkthrough worth reading.
 */
const patchNumbers = (patch: string): Set<string> => {
  const numbers = new Set<string>();
  for (const match of patch.replace(/[_,]/g, '').matchAll(/\d+(?:\.\d+)?/g)) {
    const value = Number(match[0]);
    numbers.add(match[0]);
    numbers.add(String(value));
    numbers.add(String(value * 1000));
    numbers.add(String(value / 1000));
  }

  return numbers;
};

/** A hunk header's trailing section text, without the `@@ -a,b +c,d @@` coordinates. */
const sectionOf = (header: string): string => header.replace(/^@@+[^@]*@@+/, '');

/** Everything the diff says, for grounding citations. Paths included, since prose cites them. */
const patchText = (patch: string): string =>
  parsePatch(patch)
    // The `@@` header's trailing section text is code context too, and a constant that sits there
    // rather than on a context line would otherwise make its own value look invented. The range
    // coordinates are dropped with it: a hunk starting at line 250 must not ground "250
    // milliseconds" in the prose.
    .map((file) => [file.path, ...file.hunks.flatMap((hunk) => [sectionOf(hunk.header), ...hunk.lines])].join('\n'))
    .join('\n');

/**
 * Hunks the document points at, over the hunks worth pointing at.
 *
 * Derived from the fences rather than from `fillWalkthrough`, so a stored walkthrough — whose
 * fences already carry their code — scores the same as the model output it was built from.
 */
const coverage = (
  files: Map<string, PatchFile>,
  fences: { file?: string; lines?: string }[],
): { claimedHunks: number; signalHunks: number; uncoveredFiles: string[] } => {
  const claimed = new Set<string>();
  for (const fence of fences) {
    const file = fence.file ? files.get(fence.file) : undefined;
    if (!file || isGeneratedFile(file)) {
      continue;
    }
    const range = fence.lines?.match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
    const start = range ? Number(range[1]) : undefined;
    const end = range ? (range[2] === undefined ? Number(range[1]) : Number(range[2])) : undefined;
    file.hunks.forEach((hunk, index) => {
      // No range claims the whole file, which is what the fence renders.
      const hit = start === undefined || end === undefined || (hunk.afterStart <= end && hunk.afterEnd >= start);
      if (hit) {
        claimed.add(`${file.path}#${index}`);
      }
    });
  }

  const signal = [...files.values()].filter((file) => !isGeneratedFile(file));
  const uncoveredFiles = signal
    .map((file) => ({
      path: file.path,
      missing: file.hunks.filter((_, index) => !claimed.has(`${file.path}#${index}`)).length,
    }))
    .filter((file) => file.missing > 0)
    .map((file) => `${file.path} (${file.missing})`);

  return {
    claimedHunks: claimed.size,
    signalHunks: signal.reduce((count, file) => count + file.hunks.length, 0),
    uncoveredFiles,
  };
};

/**
 * Grades a walkthrough against the patch it describes.
 *
 * Deterministic on purpose: these are the checks that need no model, run on every generation, and
 * bound what an LLM judge is then asked (see `docs/WALKTHROUGH-EVALS.md`). Correctness dimensions
 * ask whether the document lies; readability dimensions ask what it costs to read.
 */
export const scoreWalkthrough = (body: string, patch: string): WalkthroughScore => {
  const narrated = withoutAppendix(body);
  const fences = fencesOf(narrated);
  const prose = proseOf(narrated);
  const sentences = sentencesOf(prose);
  const words = wordsOf(prose);
  const files = new Map(parsePatch(patch).map((file) => [file.path, file]));
  const paths = new Set(files.keys());
  const code = patchText(patch);

  const { claimedHunks, signalHunks, uncoveredFiles } = coverage(files, fences);
  const unresolvedFences = fences.filter((fence) => !fence.file || !paths.has(fence.file));
  // A filled fence carries its OWN file's lines; an invented one does not. Per file rather than
  // over the whole patch, because a fence for one file carrying another's lines is exactly the
  // transcription this grades — and it points the reader at the wrong code.
  const linesByFile = new Map(
    [...files].map(([path, file]) => [
      path,
      new Set(
        file.hunks
          .flatMap((hunk) => [hunk.header, ...hunk.lines])
          .map((line) => line.trim())
          .filter((line) => line.length > 0),
      ),
    ]),
  );
  const invented = fences.filter((fence) => {
    if (fence.empty) {
      return false;
    }
    const own = fence.file ? linesByFile.get(fence.file) : undefined;
    const written = fence.contents
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    return !own || written.some((line) => !own.has(line));
  });
  const generatedFences = fences
    .map((fence) => fence.file)
    // Resolved through the patch so a binary the extension does not announce — caught only by
    // git's own marker — is graded the same as a lockfile.
    .filter((path): path is string => {
      const file = path ? files.get(path) : undefined;
      return !!file && isGeneratedFile(file);
    });
  const invalidRanges = badRanges(fences, files);
  const citations = citationsOf(prose);
  const ungrounded = citations.filter((token) => !code.includes(token.replace(/\(\)$/, '')));
  const numbers = numbersOf(prose);
  const grounded = patchNumbers(code);
  const inventedNumbers = numbers.filter((number) => !grounded.has(number.replace(/[_,]/g, '')));
  const longSentences = sentences.filter((sentence) => wordsOf(sentence).length > MAX_SENTENCE_WORDS);
  const slopHits = [...SLOP_WORDS, ...SLOP_PHRASES].filter((term) =>
    new RegExp(`\\b${term.replace(/ /g, '\\s+')}\\b`, 'i').test(prose),
  );
  // A bold label that only restates the line it introduces; the tell is the colon, not the bold.
  const inlineHeaders = prose.match(/^\s*[-*]?\s*\*\*[^*\n]{1,40}(?::\*\*|\*\*:)/gm) ?? [];
  const headings = prose.match(/^#{1,6} .*$/gm) ?? [];
  const titleCased = headings.filter((heading) => {
    const rest = heading.replace(/^#+ \S+ ?/, '');
    // A capitalised word naming something in the code is the code's spelling, not title case:
    // "Declare Database.Service on RemoveObjects" is a sentence, and flagging it teaches the model
    // to rename the symbol.
    const capitalised = wordsOf(rest).filter(
      (word) => /^[A-Z][a-z]/.test(word) && !code.includes(word.replace(/[^\w.]/g, '')),
    );
    return capitalised.length >= 2;
  });

  return {
    correctness: [
      {
        name: 'fences-resolve',
        score: ratio(fences.length - unresolvedFences.length, fences.length),
        sampled: fences.length,
        evidence: unresolvedFences.map((fence) => fence.file ?? '(a fence with no file)'),
      },
      {
        name: 'fences-authentic',
        // Content inside a fence is either the patch's own lines, spliced in by `fillWalkthrough`,
        // or the model transcribing a diff from memory — which gets lines subtly wrong and makes
        // the reader see the change twice, once wrongly.
        score: ratio(fences.length - invented.length, fences.length),
        sampled: fences.length,
        evidence: invented.map((fence) => fence.file ?? '(a fence with no file)'),
      },
      {
        name: 'hunk-coverage',
        score: ratio(claimedHunks, signalHunks),
        sampled: signalHunks,
        evidence: uncoveredFiles,
      },
      {
        name: 'generated-ignored',
        // A fence on a lockfile or a binary spends the reader's attention on machine output, and
        // the appendix already names those files.
        score: ratio(fences.length - generatedFences.length, fences.length),
        sampled: fences.length,
        evidence: generatedFences,
      },
      {
        name: 'ranges-valid',
        score: ratio(fences.length - invalidRanges.length, fences.length),
        sampled: fences.length,
        evidence: invalidRanges,
      },
      {
        name: 'numbers-grounded',
        score: ratio(numbers.length - inventedNumbers.length, numbers.length),
        sampled: numbers.length,
        evidence: inventedNumbers,
      },
      {
        name: 'citations-grounded',
        score: ratio(citations.length - ungrounded.length, citations.length),
        sampled: citations.length,
        evidence: ungrounded,
      },
      {
        name: 'structure',
        // One H1 naming the change, then sections: the shape the prompt asks for, and the shape the
        // reader navigates by.
        score:
          (narrated.match(/^# .+$/gm)?.length === 1 ? 0.5 : 0) +
          ((narrated.match(/^## .+$/gm)?.length ?? 0) > 0 ? 0.5 : 0),
        sampled: 1,
        evidence: headings.slice(0, 5),
      },
    ],
    readability: [
      {
        name: 'sentence-length',
        score: ratio(sentences.length - longSentences.length, sentences.length),
        sampled: sentences.length,
        evidence: longSentences.slice(0, 5),
      },
      {
        name: 'slop-free',
        // Scaled by length: one tell in a long document is a slip, five in a short one is the voice.
        score: clamp(1 - (slopHits.length * 200) / Math.max(words.length, 200)),
        sampled: words.length,
        evidence: slopHits,
      },
      {
        name: 'no-inline-headers',
        score: clamp(1 - inlineHeaders.length / Math.max(headings.length + inlineHeaders.length, 1)),
        sampled: inlineHeaders.length + headings.length,
        evidence: inlineHeaders.slice(0, 5),
      },
      {
        name: 'sentence-case-headings',
        score: ratio(headings.length - titleCased.length, headings.length),
        sampled: headings.length,
        evidence: titleCased,
      },
      {
        name: 'prose-density',
        // Neither a diff dump with headings nor an essay: every fence earns a paragraph of why.
        score: fences.length === 0 ? 0 : clamp(words.length / (fences.length * MIN_WORDS_PER_FENCE)),
        sampled: fences.length,
        evidence: [`${words.length} words of prose over ${fences.length} fences`],
      },
    ],
  };
};

/** Mean of a set of dimensions, which is what an eval reports as the row's mark. */
export const meanScore = (dimensions: Dimension[]): number =>
  dimensions.length === 0 ? 0 : dimensions.reduce((total, dimension) => total + dimension.score, 0) / dimensions.length;

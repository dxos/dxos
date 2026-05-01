//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type Commit } from '@dxos/react-ui-components';

import { CommitSelector } from './execution-graph';

const makeCommit = (id: string, opts: Partial<Commit> = {}): Commit => ({
  id,
  branch: opts.branch ?? 'main',
  message: opts.message ?? id,
  ...opts,
});

const ids = (commits: Commit[]) => commits.map((commit) => commit.id);

describe('CommitSelector', () => {
  describe('make', () => {
    test('wraps a select function', ({ expect }) => {
      const selector = CommitSelector.make((commits) => commits);
      const a = makeCommit('a');
      expect(selector.select([a])).toEqual([a]);
    });

    test('returns a pipeable selector', ({ expect }) => {
      const selector = CommitSelector.make((commits) => commits);
      expect(typeof selector.pipe).toBe('function');
    });

    test('does not mutate the input array', ({ expect }) => {
      const input = [makeCommit('a'), makeCommit('b')];
      const before = [...input];
      CommitSelector.identity().select(input);
      expect(input).toEqual(before);
    });
  });

  describe('identity', () => {
    test('returns all commits', ({ expect }) => {
      const a = makeCommit('a');
      const b = makeCommit('b');
      expect(CommitSelector.identity().select([a, b])).toEqual([a, b]);
    });

    test('returns empty for empty input', ({ expect }) => {
      expect(CommitSelector.identity().select([])).toEqual([]);
    });
  });

  describe('filter', () => {
    test('keeps commits matching predicate', ({ expect }) => {
      const a = makeCommit('a', { tags: ['x'] });
      const b = makeCommit('b');
      const selector = CommitSelector.filter((commit) => commit.tags?.includes('x'));
      expect(selector.select([a, b])).toEqual([a]);
    });

    test('returns empty array on no match', ({ expect }) => {
      const a = makeCommit('a');
      expect(CommitSelector.filter(() => false).select([a])).toEqual([]);
    });

    test('coerces predicate return values', ({ expect }) => {
      const a = makeCommit('a', { tags: ['x'] });
      const b = makeCommit('b');
      // `unknown` truthy/falsy values are accepted.
      const selector = CommitSelector.filter((commit) => commit.tags?.length);
      expect(selector.select([a, b])).toEqual([a]);
    });
  });

  describe('id', () => {
    test('matches a single commit by id', ({ expect }) => {
      const a = makeCommit('a');
      const b = makeCommit('b');
      expect(CommitSelector.id('b').select([a, b])).toEqual([b]);
    });

    test('returns empty when id is missing', ({ expect }) => {
      expect(CommitSelector.id('missing').select([makeCommit('a')])).toEqual([]);
    });

    test('returns empty for empty input', ({ expect }) => {
      expect(CommitSelector.id('a').select([])).toEqual([]);
    });
  });

  describe('tag', () => {
    test('matches commits whose tags include the tag', ({ expect }) => {
      const a = makeCommit('a', { tags: ['x'] });
      const b = makeCommit('b', { tags: ['y'] });
      expect(CommitSelector.tag('x').select([a, b])).toEqual([a]);
    });

    test('matches commits with multiple tags', ({ expect }) => {
      const a = makeCommit('a', { tags: ['x', 'y'] });
      expect(CommitSelector.tag('y').select([a])).toEqual([a]);
    });

    test('returns empty for falsy tag (undefined / null / false)', ({ expect }) => {
      const a = makeCommit('a', { tags: ['x'] });
      expect(CommitSelector.tag(undefined).select([a])).toEqual([]);
      expect(CommitSelector.tag(null).select([a])).toEqual([]);
      expect(CommitSelector.tag(false).select([a])).toEqual([]);
    });

    test('returns empty when commit has no tags', ({ expect }) => {
      expect(CommitSelector.tag('x').select([makeCommit('a')])).toEqual([]);
    });
  });

  describe('anyTags', () => {
    test('matches commits if any tag is present', ({ expect }) => {
      const a = makeCommit('a', { tags: ['x'] });
      const b = makeCommit('b', { tags: ['y'] });
      const c = makeCommit('c', { tags: ['z'] });
      expect(CommitSelector.anyTags(['x', 'y']).select([a, b, c])).toEqual([a, b]);
    });

    test('ignores falsy tags in the input list', ({ expect }) => {
      const a = makeCommit('a', { tags: ['x'] });
      expect(CommitSelector.anyTags([null, undefined, false, 'x']).select([a])).toEqual([a]);
    });

    test('returns empty when all tags are falsy', ({ expect }) => {
      const a = makeCommit('a', { tags: ['x'] });
      expect(CommitSelector.anyTags([null, undefined, false]).select([a])).toEqual([]);
    });

    test('returns empty when no commit carries any of the tags', ({ expect }) => {
      expect(CommitSelector.anyTags(['x']).select([makeCommit('a')])).toEqual([]);
    });
  });

  describe('branch', () => {
    test('matches commits by branch', ({ expect }) => {
      const a = makeCommit('a', { branch: 'main' });
      const b = makeCommit('b', { branch: 'feature' });
      expect(CommitSelector.branch('feature').select([a, b])).toEqual([b]);
    });

    test('returns empty when no commit is on the branch', ({ expect }) => {
      expect(CommitSelector.branch('feature').select([makeCommit('a', { branch: 'main' })])).toEqual([]);
    });
  });

  describe('compose', () => {
    test('applies next selector after prev', ({ expect }) => {
      const a = makeCommit('a', { branch: 'main', tags: ['keep'] });
      const b = makeCommit('b', { branch: 'main' });
      const c = makeCommit('c', { branch: 'feature', tags: ['keep'] });
      const selector = CommitSelector.branch('main').pipe(CommitSelector.compose(CommitSelector.tag('keep')));
      expect(selector.select([a, b, c])).toEqual([a]);
    });

    test('multiple composes chain left-to-right', ({ expect }) => {
      const a = makeCommit('a', { branch: 'main', tags: ['x'] });
      const b = makeCommit('b', { branch: 'main', tags: ['y'] });
      const c = makeCommit('c', { branch: 'main', tags: ['x'] });
      const selector = CommitSelector.branch('main').pipe(
        CommitSelector.compose(CommitSelector.tag('x')),
        CommitSelector.compose(CommitSelector.first()),
      );
      expect(selector.select([a, b, c])).toEqual([a]);
    });
  });

  describe('orElse', () => {
    test('returns prev result when prev is non-empty', ({ expect }) => {
      const a = makeCommit('a', { branch: 'main' });
      const b = makeCommit('b', { branch: 'feature' });
      const selector = CommitSelector.branch('main').pipe(CommitSelector.orElse(CommitSelector.branch('feature')));
      expect(selector.select([a, b])).toEqual([a]);
    });

    test('returns next result when prev is empty', ({ expect }) => {
      const b = makeCommit('b', { branch: 'feature' });
      const selector = CommitSelector.branch('main').pipe(CommitSelector.orElse(CommitSelector.branch('feature')));
      expect(selector.select([b])).toEqual([b]);
    });

    test('returns empty when both prev and next are empty', ({ expect }) => {
      const z = makeCommit('z', { branch: 'other' });
      const selector = CommitSelector.branch('main').pipe(CommitSelector.orElse(CommitSelector.branch('feature')));
      expect(selector.select([z])).toEqual([]);
    });
  });

  describe('andAlso', () => {
    test('returns the union of prev and next', ({ expect }) => {
      const a = makeCommit('a', { branch: 'main' });
      const b = makeCommit('b', { branch: 'feature' });
      const selector = CommitSelector.branch('main').pipe(CommitSelector.andAlso(CommitSelector.branch('feature')));
      expect(ids(selector.select([a, b])).toSorted()).toEqual(['a', 'b']);
    });

    test('dedupes by id', ({ expect }) => {
      const a = makeCommit('a', { branch: 'main', tags: ['x'] });
      const selector = CommitSelector.branch('main').pipe(CommitSelector.andAlso(CommitSelector.tag('x')));
      expect(selector.select([a])).toHaveLength(1);
    });
  });

  describe('first', () => {
    test('returns first n commits, defaulting to 1', ({ expect }) => {
      const a = makeCommit('a');
      const b = makeCommit('b');
      const c = makeCommit('c');
      expect(CommitSelector.first().select([a, b, c])).toEqual([a]);
      expect(CommitSelector.first(2).select([a, b, c])).toEqual([a, b]);
    });

    test('returns all when n exceeds length', ({ expect }) => {
      const a = makeCommit('a');
      expect(CommitSelector.first(5).select([a])).toEqual([a]);
    });

    test('returns empty when n=0', ({ expect }) => {
      expect(CommitSelector.first(0).select([makeCommit('a')])).toEqual([]);
    });

    test('returns empty for empty input', ({ expect }) => {
      expect(CommitSelector.first().select([])).toEqual([]);
    });
  });

  describe('last', () => {
    test('returns the last commit by default', ({ expect }) => {
      const a = makeCommit('a');
      const b = makeCommit('b');
      const c = makeCommit('c');
      const result = CommitSelector.last().select([a, b, c]);
      expect(ids(result)).toEqual(['c']);
    });

    test('returns last n commits', ({ expect }) => {
      const a = makeCommit('a');
      const b = makeCommit('b');
      const c = makeCommit('c');
      const result = CommitSelector.last(2).select([a, b, c]);
      expect(ids(result).toSorted()).toEqual(['b', 'c']);
    });

    test('returns all when n exceeds length', ({ expect }) => {
      const a = makeCommit('a');
      const result = CommitSelector.last(5).select([a]);
      expect(ids(result)).toEqual(['a']);
    });

    test('returns empty when n=0', ({ expect }) => {
      expect(CommitSelector.last(0).select([makeCommit('a')])).toEqual([]);
    });

    test('returns empty for empty input', ({ expect }) => {
      expect(CommitSelector.last().select([])).toEqual([]);
    });

    test('produces the most recent commit on a branch when composed', ({ expect }) => {
      // Common usage pattern in execution-graph: pick the most recent commit on a branch.
      const a = makeCommit('a', { branch: 'main' });
      const b = makeCommit('b', { branch: 'main' });
      const c = makeCommit('c', { branch: 'main' });
      const selector = CommitSelector.branch('main').pipe(CommitSelector.compose(CommitSelector.last()));
      expect(ids(selector.select([a, b, c]))).toEqual(['c']);
    });
  });

  describe('not', () => {
    test('inverts the selection', ({ expect }) => {
      const a = makeCommit('a', { tags: ['x'] });
      const b = makeCommit('b');
      expect(CommitSelector.not(CommitSelector.tag('x')).select([a, b])).toEqual([b]);
    });

    test('returns all when inner selector matches nothing', ({ expect }) => {
      const a = makeCommit('a');
      expect(CommitSelector.not(CommitSelector.id('missing')).select([a])).toEqual([a]);
    });

    test('returns empty when inner selector matches everything', ({ expect }) => {
      const a = makeCommit('a');
      const b = makeCommit('b');
      expect(CommitSelector.not(CommitSelector.identity()).select([a, b])).toEqual([]);
    });
  });

  describe('unionAll', () => {
    test('combines results from multiple selectors', ({ expect }) => {
      const a = makeCommit('a', { branch: 'main' });
      const b = makeCommit('b', { branch: 'feature' });
      const selector = CommitSelector.unionAll(CommitSelector.branch('main'), CommitSelector.branch('feature'));
      expect(ids(selector.select([a, b])).toSorted()).toEqual(['a', 'b']);
    });

    test('dedupes by id', ({ expect }) => {
      const a = makeCommit('a', { branch: 'main', tags: ['x'] });
      const selector = CommitSelector.unionAll(CommitSelector.branch('main'), CommitSelector.tag('x'));
      expect(selector.select([a])).toHaveLength(1);
    });

    test('returns empty when called with no selectors', ({ expect }) => {
      expect(CommitSelector.unionAll().select([makeCommit('a')])).toEqual([]);
    });
  });

  describe('intersectAll', () => {
    test('returns commits matching all selectors', ({ expect }) => {
      const a = makeCommit('a', { branch: 'main', tags: ['x'] });
      const b = makeCommit('b', { branch: 'main', tags: ['y'] });
      const c = makeCommit('c', { branch: 'feature', tags: ['x'] });
      const selector = CommitSelector.intersectAll(CommitSelector.branch('main'), CommitSelector.tag('x'));
      expect(selector.select([a, b, c])).toEqual([a]);
    });

    test('returns empty when called with no selectors', ({ expect }) => {
      expect(CommitSelector.intersectAll().select([makeCommit('a')])).toEqual([]);
    });

    test('returns empty when no commit matches all selectors', ({ expect }) => {
      const a = makeCommit('a', { branch: 'main' });
      const selector = CommitSelector.intersectAll(CommitSelector.branch('main'), CommitSelector.tag('x'));
      expect(selector.select([a])).toEqual([]);
    });
  });

  describe('firstOf', () => {
    test('returns the first selector result that is non-empty', ({ expect }) => {
      const a = makeCommit('a', { branch: 'main' });
      const b = makeCommit('b', { branch: 'feature' });
      const selector = CommitSelector.firstOf(
        CommitSelector.branch('missing'),
        CommitSelector.branch('main'),
        CommitSelector.branch('feature'),
      );
      expect(selector.select([a, b])).toEqual([a]);
    });

    test('falls through all empty selectors', ({ expect }) => {
      const selector = CommitSelector.firstOf(CommitSelector.id('x'), CommitSelector.id('y'));
      expect(selector.select([])).toEqual([]);
    });

    test('returns empty when called with no selectors', ({ expect }) => {
      expect(CommitSelector.firstOf().select([makeCommit('a')])).toEqual([]);
    });
  });

  describe('pipeable', () => {
    test('OperationStart pipeline: branch || start-marker tag, then last', ({ expect }) => {
      // Mirrors `parents` selector for `OperationStart` in execution-graph.ts.
      // Parent is on a different branch but carries the start-marker tag for the new event's parent pid.
      const parent = makeCommit('parent', { branch: 'main', tags: ['start-marker:p1'] });
      const selector = CommitSelector.branch('p1').pipe(
        CommitSelector.orElse(CommitSelector.tag('start-marker:p1')),
        CommitSelector.compose(CommitSelector.last()),
      );
      expect(ids(selector.select([parent]))).toEqual(['parent']);
    });

    test('pipe with a single composer matches direct application', ({ expect }) => {
      const a = makeCommit('a', { tags: ['x'] });
      const b = makeCommit('b');
      const piped = CommitSelector.identity().pipe(CommitSelector.compose(CommitSelector.tag('x')));
      const direct = CommitSelector.compose(CommitSelector.tag('x'))(CommitSelector.identity());
      expect(piped.select([a, b])).toEqual(direct.select([a, b]));
    });

    test('multi-stage pipe applies stages left-to-right', ({ expect }) => {
      const a = makeCommit('a', { branch: 'main', tags: ['x'] });
      const b = makeCommit('b', { branch: 'main', tags: ['y'] });
      const c = makeCommit('c', { branch: 'main', tags: ['x'] });
      const selector = CommitSelector.branch('main').pipe(
        CommitSelector.compose(CommitSelector.tag('x')),
        CommitSelector.compose(CommitSelector.last()),
      );
      expect(ids(selector.select([a, b, c]))).toEqual(['c']);
    });
  });
});

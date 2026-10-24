//
// Copyright 2026 DXOS.org
//

import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import * as Yaml from 'yaml';

/** Layout names supported by the Slidev subset. */
export const LAYOUTS = [
  'default',
  'cover',
  'center',
  'section',
  'intro',
  'end',
  'fact',
  'statement',
  'quote',
  'two-cols',
  'two-cols-header',
  'three-cols',
  'two-by-two',
  'image',
  'image-left',
  'image-right',
  'full',
  'none',
] as const;

export type LayoutName = (typeof LAYOUTS)[number];

/** Sides a column layout's outer column can extend to the slide's edge on (`bleed:`). */
export const BLEED_SIDES = ['left', 'right'] as const;

export type BleedSide = (typeof BLEED_SIDES)[number];

/** A problem found while parsing or validating a slide; the slide still renders. */
export type SlideIssue = {
  kind: 'frontmatter' | 'layout' | 'theme' | 'html';
  message: string;
};

const fields = {
  layout: Schema.String,
  image: Schema.String,
  background: Schema.String,
  class: Schema.String,
  title: Schema.String,
  backgroundVideo: Schema.String,
  backgroundOpacity: Schema.Number.check(Schema.isBetween({ minimum: 0, maximum: 1 })),
  backgroundPosition: Schema.String,
  bleed: Schema.Literals(BLEED_SIDES),
  hide: Schema.Boolean,
  theme: Schema.String,
};

/** Per-slide frontmatter; unknown keys are dropped. */
export const SlideFrontmatter = Schema.Struct({
  layout: Schema.optionalKey(fields.layout),
  image: Schema.optionalKey(fields.image),
  background: Schema.optionalKey(fields.background),
  class: Schema.optionalKey(fields.class),
  title: Schema.optionalKey(fields.title),
  backgroundVideo: Schema.optionalKey(fields.backgroundVideo),
  backgroundOpacity: Schema.optionalKey(fields.backgroundOpacity),
  backgroundPosition: Schema.optionalKey(fields.backgroundPosition),
  /** DXOS: the outer column on this side reaches the slide's edges, with no padding (`two-cols`, `three-cols`). */
  bleed: Schema.optionalKey(fields.bleed),
  /** The slide is left out when the deck is presented; it still shows in the grid. */
  hide: Schema.optionalKey(fields.hide),
  /** Deck theme; read only from the first slide (Slidev headmatter). */
  theme: Schema.optionalKey(fields.theme),
});

export type SlideFrontmatter = Schema.Schema.Type<typeof SlideFrontmatter>;

/**
 * Parses a slide's YAML frontmatter, keeping each valid known field and reporting the rest;
 * malformed YAML yields empty frontmatter so the slide body still renders.
 */
export const parseFrontmatter = (yaml: string): { frontmatter: SlideFrontmatter; issues: SlideIssue[] } => {
  const issues: SlideIssue[] = [];
  let data: unknown;
  try {
    data = Yaml.parse(yaml);
  } catch (error) {
    return { frontmatter: {}, issues: [{ kind: 'frontmatter', message: `Invalid YAML: ${String(error)}` }] };
  }

  if (data === null || data === undefined) {
    return { frontmatter: {}, issues };
  }
  if (typeof data !== 'object' || Array.isArray(data)) {
    return { frontmatter: {}, issues: [{ kind: 'frontmatter', message: 'Frontmatter must be a YAML mapping.' }] };
  }

  const frontmatter: Record<string, unknown> = {};
  for (const [key, schema] of Object.entries(fields)) {
    if (!(key in data)) {
      continue;
    }
    const result = Schema.decodeUnknownResult(schema)(Reflect.get(data, key));
    if (Result.isSuccess(result)) {
      frontmatter[key] = result.success;
    } else {
      issues.push({ kind: 'frontmatter', message: `Invalid "${key}": ${result.failure.message}` });
    }
  }

  return { frontmatter: Schema.decodeUnknownSync(SlideFrontmatter)(frontmatter), issues };
};

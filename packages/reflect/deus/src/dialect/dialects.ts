//
// Copyright 2026 DXOS.org
//

import APP from '../../lang/app.mdl?raw';
import CHANGELOG from '../../lang/changelog.mdl?raw';
import CODE from '../../lang/code.mdl?raw';
import CORE from '../../lang/core.mdl?raw';
import FEATURES from '../../lang/features.mdl?raw';
import PLUGIN from '../../lang/plugin.mdl?raw';
import QA from '../../lang/qa.mdl?raw';
import REVIEW from '../../lang/review.mdl?raw';
import SQL from '../../lang/sql.mdl?raw';
import VIDEO from '../../lang/video.mdl?raw';
import { frontmatter } from '../spec-index/parse.ts';

/** The dialects in `lang/`, by frontmatter id. */
export const DIALECTS: ReadonlyMap<string, string> = new Map(
  [APP, CHANGELOG, CODE, CORE, FEATURES, PLUGIN, QA, REVIEW, SQL, VIDEO].map((text) => [frontmatter(text).id, text]),
);

/** The ids a document's frontmatter lists under `extends`. */
export const extendsOf = (text: string): string[] => {
  const block = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  return [...(block.match(/^extends:\s*\n((?:\s+-\s*.+\n?)*)/m)?.[1] ?? '').matchAll(/-\s*(\S+)/g)].map(([, id]) => id);
};

/**
 * The texts of the dialects `ids` name and of every dialect they extend, each once, a dialect after those it extends;
 * an id with no known text is skipped.
 */
export const dialectTexts = (ids: readonly string[], known: ReadonlyMap<string, string> = DIALECTS): string[] => {
  const texts: string[] = [];
  const seen = new Set<string>();
  const visit = (id: string) => {
    const text = known.get(id);
    if (seen.has(id) || text === undefined) {
      return;
    }
    seen.add(id);
    extendsOf(text).forEach(visit);
    texts.push(text);
  };
  ids.forEach(visit);
  return texts;
};

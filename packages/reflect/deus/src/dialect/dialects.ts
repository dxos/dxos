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
import SOFTWARE from '../../lang/software.mdl?raw';
import SQL from '../../lang/sql.mdl?raw';
import VIDEO from '../../lang/video.mdl?raw';
import WORKER from '../../lang/worker.mdl?raw';
import { frontmatter } from '../spec-index/parse.ts';
import * as Resolve from './resolve.ts';

/** The dialects in `lang/`, by frontmatter id. */
export const DIALECTS: ReadonlyMap<string, string> = new Map(
  [APP, CHANGELOG, CODE, CORE, FEATURES, PLUGIN, QA, REVIEW, SOFTWARE, SQL, VIDEO, WORKER].map((text) => [
    frontmatter(text).id,
    text,
  ]),
);

export { BASE_DIALECTS, SOFTWARE_DIALECT, extendsOf, withDialects } from './resolve.ts';

/**
 * The texts of the dialects `ids` name and of every dialect they extend, each once, a dialect after those it extends;
 * an id with no known text is skipped.
 */
export const dialectTexts = (ids: readonly string[], known: ReadonlyMap<string, string> = DIALECTS): string[] =>
  Resolve.dialectTexts(ids, known);

/**
 * The dialects a `.mdl` file is read with, and a spec imported from it holds: the known ones its frontmatter extends,
 * else the software dialect.
 */
export const fileDialects = (text: string, known: ReadonlyMap<string, string> = DIALECTS): readonly string[] =>
  Resolve.fileDialects(text, known);

/** The dialects a spec is read with: the known ones of its `dialects`, else {@link BASE_DIALECTS}. */
export const resolveDialects = (
  dialects: readonly string[],
  known: ReadonlyMap<string, string> = DIALECTS,
): readonly string[] => Resolve.resolveDialects(dialects, known);

/** The block types the dialects `ids` declare. */
export const dialectBlockTypes = (
  ids: readonly string[],
  known: ReadonlyMap<string, string> = DIALECTS,
): readonly string[] => Resolve.dialectBlockTypes(ids, known);

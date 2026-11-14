//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { SessionConfig } from '@dxos/ai';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import * as Routine from '@dxos/compute/Routine';
import * as Spec from '@dxos/compute/Spec';
import { DIALECTS, dialectTexts, extendsOf, fileDialects } from '@dxos/deus/dialect';
import { frontmatter, frontmatterData, withoutFrontmatter } from '@dxos/deus/spec-index';
import { DXN, Format, Migration, Obj, Ref, Type, type URI } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { log } from '@dxos/log';
import { Text } from '@dxos/schema';
import { Outline, Repo, TaskSet } from '@dxos/types';

/**
 * The 0.6.0 `Project`, which owned at most one spec (`spec`) where 0.7.0 owns a list (`specs`). Kept solely so
 * `Migration.define` can read existing data. Never constructed by this plugin.
 */
export class ProjectV6 extends Type.makeObject<ProjectV6>(DXN.make('org.dxos.type.project', '0.6.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    description: Schema.optional(Format.Text),
    status: Schema.optional(Project.ProjectStatus),
    instructions: Schema.optional(Ref.Ref(Instructions.Instructions)),
    artifacts: Schema.Array(Ref.Ref(Obj.Unknown)),
    routines: Schema.Array(Ref.Ref(Routine.Routine)),
    outline: Schema.optional(Ref.Ref(Outline.Outline)),
    spec: Schema.optional(Ref.Ref(Obj.Unknown)),
    taskSet: Schema.optional(Ref.Ref(TaskSet.TaskSet)),
    repo: Schema.optional(Ref.Ref(Repo.Repo)),
    repositories: Schema.optional(Schema.Array(Ref.Ref(Repo.Repo))),
    session: Schema.optional(SessionConfig.SessionConfig),
  }),
) {}

/** The 0.7.0 `Project`, kept only so `projectRepositories` can read existing data. */
export class ProjectV7 extends Type.makeObject<ProjectV7>(DXN.make('org.dxos.type.project', '0.7.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    description: Schema.optional(Format.Text),
    status: Schema.optional(Project.ProjectStatus),
    instructions: Schema.optional(Ref.Ref(Instructions.Instructions)),
    artifacts: Schema.Array(Ref.Ref(Obj.Unknown)),
    routines: Schema.Array(Ref.Ref(Routine.Routine)),
    outline: Schema.optional(Ref.Ref(Outline.Outline)),
    specs: Schema.Array(Ref.Ref(Spec.Spec)),
    taskSet: Schema.optional(Ref.Ref(TaskSet.TaskSet)),
    repo: Schema.optional(Ref.Ref(Repo.Repo)),
    repositories: Schema.optional(Schema.Array(Ref.Ref(Repo.Repo))),
    session: Schema.optional(SessionConfig.SessionConfig),
  }),
) {}

/**
 * `Project` 0.6.0 → 0.7.0: a project owns a list of specs (`specs`) where it owned at most one (`spec`). Runs before any
 * migration of the specs a project owns, so each finds the project's specs where 0.7.0 keeps them.
 */
export const projectSpecs = Migration.define({
  from: ProjectV6,
  to: ProjectV7,
  transform: async ({ spec, ...rest }) => ({
    ...rest,
    specs: spec ? [Ref.fromURI(spec.uri)] : [],
  }),
});

/** `Project` 0.7.0 → 0.8.0: `repo` and `repositories` move to `Repo.RepositoriesAnnotation`; `session` is dropped. */
const makeProjectRepositories = (): Migration.ObjectMigration => {
  // Each project's repository URIs, read in the transform while its refs are still live.
  const repositories = new Map<string, URI.URI[]>();
  return Migration.define({
    from: ProjectV7,
    to: Project.Project,
    transform: async ({ id, repo, repositories: list, session: _session, ...rest }) => {
      const uris = [...(repo ? [repo] : []), ...(list ?? [])].map((ref) => ref.uri);
      repositories.set(
        id,
        uris.filter((uri, index) => uris.indexOf(uri) === index),
      );
      return rest;
    },
    onMigration: async ({ object }) => {
      // Written here rather than in the transform, which cannot carry refs in meta.
      const uris = repositories.get(object.id) ?? [];
      repositories.delete(object.id);
      if (uris.length > 0) {
        Repo.setRepositories(
          object,
          uris.map((uri) => Ref.fromURI(uri)),
        );
      }
    },
  });
};

export const projectRepositories = makeProjectRepositories();

/** The dialects a software spec listed before `Spec` 0.4.0, where it lists the one software dialect that extends them. */
const SOFTWARE_DIALECTS_V3: readonly string[] = [
  'org.dxos.spec.features',
  'org.dxos.spec.app',
  'org.dxos.spec.plugin',
  'org.dxos.spec.qa',
  'org.dxos.spec.sql',
];

/**
 * `dialects` as 0.4.0 lists them, each once: where they used the features dialect, the one software dialect in place
 * of the software package's, at the first of them; other dialects stay.
 */
export const softwareDialects = (dialects: readonly string[]): string[] => {
  const first = dialects.includes('org.dxos.spec.features')
    ? dialects.findIndex((id) => SOFTWARE_DIALECTS_V3.includes(id))
    : -1;
  if (first < 0) {
    return [...new Set(dialects)];
  }
  const kept = dialects.filter((id) => !SOFTWARE_DIALECTS_V3.includes(id));
  return [...kept.slice(0, first), 'org.dxos.spec.software', ...kept.slice(first)].filter(
    (id, index, all) => all.indexOf(id) === index,
  );
};

/**
 * The 0.3.0 `Spec`, which listed the software package's dialects one by one where 0.4.0 lists the software dialect
 * that extends them. Kept solely so `Migration.define` can read existing data. Never constructed by this plugin.
 */
export class SpecV3 extends Type.makeObject<SpecV3>(DXN.make('org.dxos.type.projects.spec', '0.3.0'))(
  Schema.Struct({
    name: Schema.String,
    description: Schema.optional(Schema.String),
    dialects: Schema.Array(Schema.String),
    content: Ref.Ref(Text.Text),
  }),
) {}

/**
 * Takes a file's front matter into the spec's fields with the migration's own rules: its name where the spec's is
 * empty or a file path, its meta key and version where unset, and the dialects its `extends` names that the spec's do
 * not already extend ({@link fileDialects} where the spec lists none), as 0.4.0 lists them. Front matter that does not
 * parse gives nothing; false then.
 */
export const takeFrontMatterFields = (spec: Spec.Spec, file: string): boolean => {
  if (frontmatterData(file) === undefined) {
    return false;
  }
  const fields = frontmatter(file);
  Obj.update(spec, (spec) => {
    if (fields.name && (!spec.name || spec.name.endsWith('.mdl'))) {
      spec.name = fields.name;
    }
    const meta = Obj.getMeta(spec);
    meta.key ??= fields.id;
    meta.version ??= fields.version;
    const extended = new Set(dialectTexts(spec.dialects).map((dialect) => frontmatter(dialect).id));
    const named = softwareDialects(
      spec.dialects.length === 0
        ? fileDialects(file)
        : extendsOf(file).filter((id) => DIALECTS.has(id) && !extended.has(id)),
    );
    spec.dialects.push(...named.filter((id) => !spec.dialects.includes(id)));
  });
  return true;
};

/**
 * Moves the front matter at the start of a spec's text into its fields ({@link takeFrontMatterFields}). Its first
 * block is front matter, as in a file, so the text keeps what follows it, edited in place so anchors into it hold; a
 * block that does not parse gives nothing, and a linked file still holds it. False when the block does not parse.
 */
export const moveFrontMatter = (spec: Spec.Spec, text: Text.Text): boolean => {
  const file = text.content;
  const body = withoutFrontmatter(file);
  if (body === file) {
    return true;
  }
  const readable = takeFrontMatterFields(spec, file);
  Doc.updateText(text, ['content'], body);
  return readable;
};

/** {@link moveFrontMatter} once the spec's text loads; every migration that makes a current spec calls it. */
export const takeFrontMatter = async (spec: Spec.Spec): Promise<void> => {
  const text = await spec.content.tryLoad();
  if (!text) {
    log.warn('spec text not loaded; front matter left in place', { spec: spec.id });
  } else if (!moveFrontMatter(spec, text)) {
    log.warn('spec front matter does not parse; removed from the text and nothing taken', { spec: spec.id });
  }
};

/**
 * `Spec` 0.3.0 → 0.4.0: a spec that used the features dialect, which made it a software spec, lists the one software
 * dialect in place of the software package's dialects; its other dialects stay, and every other spec keeps its own. Its
 * text's front matter moves into its fields ({@link takeFrontMatter}).
 */
export const specSoftwareDialect = Migration.define({
  from: SpecV3,
  to: Spec.Spec,
  transform: async ({ name, description, dialects, content }) => ({
    name,
    description,
    dialects: softwareDialects(dialects),
    content: Ref.fromURI(content.uri),
  }),
  onMigration: ({ object }) => takeFrontMatter(object),
});

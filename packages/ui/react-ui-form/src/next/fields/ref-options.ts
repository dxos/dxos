//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo } from 'react';

import { type Database, DXN, Entity, Filter, Obj, Query, Scope, Tag, Type } from '@dxos/echo';
import { useType as defaultUseType, useQuery } from '@dxos/echo-react';
import { ANY_OBJECT_TYPENAME, ReferenceAnnotationId, type ReferenceAnnotationValue } from '@dxos/echo/internal';
import { type SchemaAST, SchemaEx } from '@dxos/effect';
import { useTranslation } from '@dxos/react-ui';
import { hues } from '@dxos/ui-types';

import { type CreateOptions, type RefFieldDataProps } from '#types';

import { filterTagCandidates } from '../../components/Form/meta-tags.ts';
import { omitHiddenFormFields, omitId } from '../../util/index.ts';

/** The typename of the meta-tags field's targets, whose rows are a multiple selection of chips. */
export const TAG_TYPENAME = Type.getTypename(Tag.Tag);

/**
 * The candidates for a ref field: objects of its type in the space and the registry (space objects only for an untyped
 * ref); tag candidates are the user tags only (`filterTagCandidates`).
 */
export const defaultUseResults: NonNullable<RefFieldDataProps['useResults']> = (db, typename) => {
  const results = useQuery(
    db,
    !typename
      ? Query.select(Filter.nothing())
      : typename === ANY_OBJECT_TYPENAME
        ? Query.select(Filter.everything())
        : Query.select(Filter.type(DXN.make(typename))).from(Scope.space(), Scope.registry()),
  );
  const isTagField = typename === TAG_TYPENAME;
  return useMemo(() => (isTagField ? filterTagCandidates(results) : results), [isTagField, results]);
};

/** Each candidate as an option labelled by its label (else its URI), with a tag's hue. */
export const defaultGetOptions: NonNullable<RefFieldDataProps['getOptions']> = (results) =>
  results.map((result) => {
    const id = Entity.getURI(result, { prefer: 'named' });
    const hue = Obj.instanceOf(Tag.Tag, result) ? hues.find((hue) => hue === result.hue) : undefined;
    return { id, label: Entity.getLabel(result) ?? id, ...(hue && { hue }) };
  });

export type RefCandidatesOptions = RefFieldDataProps &
  Pick<CreateOptions, 'createOptionLabel'> & {
    /** The ref type (a single ref's, or an array's element). */
    refType: SchemaAST.AST;
    db?: Database.Database;
  };

/**
 * The data path a ref picker shares: the ref's typename, its candidates as options, and, when the caller can persist
 * one, the inline create form's schema, a `create` that persists its values, and the create row's translated label.
 */
export const useRefCandidates = (options: RefCandidatesOptions) => {
  const {
    refType,
    db,
    useType = defaultUseType,
    useResults = defaultUseResults,
    getOptions = defaultGetOptions,
    createOptionLabel,
    onCreate,
    resolveCreateEntry,
  } = options;
  const { t } = useTranslation();
  const typename = useMemo(
    () => SchemaEx.findAnnotation<ReferenceAnnotationValue>(refType, ReferenceAnnotationId)?.typename,
    [refType],
  );
  const results = useResults(db, typename);
  const candidates = useMemo(() => getOptions(results), [results, getOptions]);
  const entity = useType(db, typename && typename !== ANY_OBJECT_TYPENAME ? DXN.make(typename) : undefined);
  // A plugin-registered entry (e.g. `SpaceCapabilities.CreateObjectEntry`) replaces the raw type's schema and create.
  const createEntry = typename ? resolveCreateEntry?.(typename) : undefined;
  const createSchema = useMemo(
    () => createEntry?.inputSchema ?? (entity && omitHiddenFormFields(omitId(Type.getSchema(entity)))),
    [createEntry, entity],
  );

  const persist = useCallback(
    async (values: any) =>
      createEntry?.createObject && db
        ? await createEntry.createObject(values, db)
        : entity && onCreate
          ? await onCreate(entity, values)
          : undefined,
    [createEntry, db, entity, onCreate],
  );

  const createLabel = useMemo(() => {
    if (!createOptionLabel) {
      return undefined;
    }
    const [key, { ns }] = createOptionLabel;
    return (query: string) => t(key, { ns, text: query, interpolation: { escapeValue: false } });
  }, [createOptionLabel, t]);

  return {
    typename,
    entity,
    results,
    options: candidates,
    createSchema,
    createLabel,
    // A resolvable type alone is not enough (operation refs cannot be created ad hoc): the caller must persist it.
    create: onCreate || createEntry?.createObject ? persist : undefined,
  };
};

import { Schema as S } from '@effect/schema';

//
// ForeignKey
//

const _ForeignKeySchema = S.Struct({
  source: S.String,
  id: S.String,
});

export type ForeignKey = S.Schema.Type<typeof _ForeignKeySchema>;

export const ForeignKeySchema: S.Schema<ForeignKey> = _ForeignKeySchema;

//
// ObjectMeta
//

export const ObjectMetaSchema = S.mutable(
  S.Struct({
    keys: S.mutable(S.Array(ForeignKeySchema)),
  }),
);

export type ObjectMeta = S.Schema.Type<typeof ObjectMetaSchema>;

export const foreignKey = (source: string, id: string): ForeignKey => ({ source, id });
export const foreignKeyEquals = (a: ForeignKey, b: ForeignKey) => a.source === b.source && a.id === b.id;

import { Schema } from 'effect';
declare const SortDirection: Schema.Union<[Schema.Literal<["asc"]>, Schema.Literal<["desc"]>]>;
export type SortDirectionType = Schema.Schema.Type<typeof SortDirection>;
declare const FieldSort: Schema.mutable<Schema.Struct<{
    fieldId: typeof Schema.String;
    direction: Schema.Union<[Schema.Literal<["asc"]>, Schema.Literal<["desc"]>]>;
}>>;
export interface FieldSortType extends Schema.Schema.Type<typeof FieldSort> {
}
export declare const FieldSortType: Schema.Schema<FieldSortType>;
/**
 * ECHO query object.
 */
declare const QuerySchema: Schema.mutable<Schema.Struct<{
    typename: Schema.optional<typeof Schema.String>;
    sort: Schema.optional<Schema.Array$<Schema.mutable<Schema.Struct<{
        fieldId: typeof Schema.String;
        direction: Schema.Union<[Schema.Literal<["asc"]>, Schema.Literal<["desc"]>]>;
    }>>>>;
}>>;
export interface QueryType extends Schema.Schema.Type<typeof QuerySchema> {
}
export declare const QueryType: Schema.Schema<QueryType>;
export {};
//# sourceMappingURL=query.d.ts.map
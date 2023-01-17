import { JSONOutput as Schema } from 'typedoc';
export declare type AllStringifiers = {
    [K in keyof Schema.TypeKindMap]: (node: Schema.TypeKindMap[K]) => string;
};
export declare class MdTypeStringifier implements AllStringifiers {
    readonly root: Schema.Reflection;
    constructor(root: Schema.Reflection);
    /**
     * Return a string representation of the given type.
     */
    stringify(node: Schema.SomeType): string;
    type(node: Schema.SomeType): string;
    array(node: Schema.ArrayType): string;
    list(list: Schema.Type[], separator: string): string;
    conditional(node: Schema.ConditionalType): string;
    indexedAccess(node: Schema.IndexedAccessType): string;
    inferred(node: Schema.InferredType): string;
    intersection(node: Schema.IntersectionType): string;
    intrinsic(node: Schema.IntrinsicType): string;
    predicate(node: Schema.PredicateType): string;
    query(node: Schema.QueryType): string;
    reference(node: Schema.ReferenceType): string;
    reflection(node: Schema.ReflectionType): string;
    literal(node: Schema.LiteralType): string;
    tuple(node: Schema.TupleType): string;
    typeOperator(node: Schema.TypeOperatorType): string;
    union(node: Schema.UnionType): string;
    unknown(node: Schema.UnknownType): string;
    void(): string;
    mapped(node: Schema.MappedType): string;
    optional(node: Schema.OptionalType): string;
    rest(node: Schema.RestType): string;
    'template-literal'(node: Schema.TemplateLiteralType): string;
    'named-tuple-member'(node: Schema.NamedTupleMemberType): string;
    callSignature(node: Schema.SignatureReflection, name?: string): string;
}
//# sourceMappingURL=MdTypeStringifier.d.ts.map
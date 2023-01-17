import { Reflection, ReflectionKind, JSONOutput as Schema } from 'typedoc';
import { MdTypeStringifier } from './MdTypeStringifier.js';
import { TypeStringifier } from './TypeStringifier.js';
export declare type ClassMemberKind = 'constructors' | 'properties' | 'methods';
export declare type RenderingStyle = 'list' | 'table';
export declare type Alignment = 'left' | 'center' | 'right';
export declare type StringifyOptions = {
    title?: boolean;
    sources?: boolean;
    comment?: boolean;
    headers?: boolean;
    subset?: ClassMemberKind[];
    style?: RenderingStyle;
    level?: number;
};
export declare class Stringifier {
    readonly root: Schema.Reflection;
    constructor(root: Schema.Reflection);
    readonly md: MdTypeStringifier;
    readonly txt: TypeStringifier;
    children(ref: Schema.ContainerReflection, kind?: ReflectionKind): Schema.Reflection[];
    href(ref: Reflection): string;
    generic(ref: Schema.ContainerReflection, indent?: number): string;
    sources(ref: Schema.ContainerReflection): string;
    comment(comment?: Schema.Comment): string;
    json(val: any): string;
    signature(ref: Schema.SignatureReflection): string;
    param(ref: Schema.ParameterReflection): string;
    paramName(ref: Schema.ParameterReflection): string;
    method(ref: Schema.DeclarationReflection): string;
    property(ref: Schema.DeclarationReflection, options?: StringifyOptions): string;
    propertyRow(ref: Schema.DeclarationReflection): string;
    table(options: {
        headers: string[];
        alignment?: Alignment[];
        rows?: string[];
    }): string;
    declaration(declaration: Schema.DeclarationReflection): void;
    type(atype: Schema.DeclarationReflection, options?: StringifyOptions): string;
    class(aclass: Schema.DeclarationReflection, options?: StringifyOptions): string;
    interface(node: Schema.DeclarationReflection, options?: StringifyOptions): string;
    stringify(node?: Schema.Reflection | null, options?: StringifyOptions): string;
}
//# sourceMappingURL=Stringifier.d.ts.map
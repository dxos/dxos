export interface Value {
    null?: boolean;
    bool?: boolean;
    int?: number;
    float?: number;
    string?: string;
    timestamp?: string;
    datetime?: string;
    bytes?: Uint8Array;
    object?: Object;
    array?: Array;
}
export interface Array {
    values?: Value[];
}
export interface KeyValue {
    key?: string;
    value?: Value;
}
export interface Object {
    properties?: KeyValue[];
}
export interface Predicate {
    op?: Predicate.Operation;
    key?: string;
    value?: Value;
    predicates?: Predicate[];
}
export namespace Predicate {
    export enum Operation {
        OR = 0,
        AND = 1,
        NOT = 2,
        IN = 10,
        EQUALS = 11,
        GTE = 12,
        GT = 13,
        LTE = 14,
        LT = 15,
        PREFIX_MATCH = 20,
        TEXT_MATCH = 21
    }
}
export interface Query {
    root?: Predicate;
}
export interface ObjectSnapshot {
    root?: Value;
}
export interface ObjectMutation {
    operation?: ObjectMutation.Operation;
    key?: string;
    value?: Value;
}
export namespace ObjectMutation {
    export enum Operation {
        SET = 0,
        DELETE = 1,
        ARRAY_PUSH = 2,
        SET_ADD = 4,
        SET_DELETE = 5
    }
}
export interface ObjectMutationSet {
    mutations?: ObjectMutation[];
}

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
}
export interface KeyValue {
    key?: string;
    value?: Value;
}
export interface Object {
    properties?: KeyValue[];
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
        SET_ADD = 3,
        SET_DELETE = 4
    }
}
export interface ObjectMutationSet {
    mutations?: ObjectMutation[];
}
export interface ObjectSnapshot {
    root?: Value;
}

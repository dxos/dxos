export interface Alive {
    peerId?: Uint8Array;
    connections?: Alive.Connection[];
    metadata?: Uint8Array;
}
export namespace Alive {
    export interface Connection {
        peerId?: Uint8Array;
        initiator?: boolean;
    }
}

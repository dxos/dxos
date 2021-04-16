import * as google_protobuf from "../google/protobuf";
export interface Message {
    nmId?: string;
    nmResponse?: boolean;
    nmEphemeral?: boolean;
    nmData?: google_protobuf.Any;
}
export interface Error {
    code?: string;
    message?: string;
}
export interface Buffer {
    data?: Uint8Array;
}

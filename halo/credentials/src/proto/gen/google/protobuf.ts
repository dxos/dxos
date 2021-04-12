import { Schema as CodecSchema } from "@dxos/codec-protobuf";
import { PublicKey } from "@dxos/crypto";
import { SecretKey } from "../../../keys";
import { DecodedAny } from "../../any";
import * as dxos_credentials_identity from "../dxos/credentials/identity";
import * as dxos_credentials_greet from "../dxos/credentials/greet";
import * as dxos_credentials_keys from "../dxos/credentials/keys";
import * as dxos_credentials_auth from "../dxos/credentials/auth";
import * as dxos_credentials from "../dxos/credentials";
import * as dxos_credentials_party from "../dxos/credentials/party";
export interface Any {
    type_url?: string;
    value?: Uint8Array;
}
export interface DoubleValue {
    value?: number;
}
export interface FloatValue {
    value?: number;
}
export interface Int64Value {
    value?: number;
}
export interface UInt64Value {
    value?: number;
}
export interface Int32Value {
    value?: number;
}
export interface UInt32Value {
    value?: number;
}
export interface BoolValue {
    value?: boolean;
}
export interface StringValue {
    value?: string;
}
export interface BytesValue {
    value?: Uint8Array;
}

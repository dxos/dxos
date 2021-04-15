import { Schema as CodecSchema } from "@dxos/codec-protobuf";
import { PublicKey } from "@dxos/crypto";
import { SecretKey } from "../../../../keys";
import { DecodedAny } from "../../../any";
import * as dxos_credentials from "../credentials";
import * as dxos_credentials_auth from "./auth";
import * as dxos_credentials_greet from "./greet";
import * as dxos_credentials_keys from "./keys";
import * as dxos_credentials_party from "./party";
import * as google_protobuf from "../../google/protobuf";
export interface IdentityInfo {
    publicKey?: PublicKey;
    displayName?: string;
}
export interface DeviceInfo {
    publicKey?: PublicKey;
    displayName?: string;
}

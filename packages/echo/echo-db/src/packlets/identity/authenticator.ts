import { AuthProvider } from "../space/auth-plugin";
import { CredentialSigner } from "./credential-signer";

// export const createHaloAuthProvider: AuthProvider = (signer: CredentialSigner): CredentialSigner => nonce => signer({
//   assertion: {
//     "@type": "dxos.halo.credentials.Auth",
//   }
// })
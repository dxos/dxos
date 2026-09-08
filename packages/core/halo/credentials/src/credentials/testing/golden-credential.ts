//
// Copyright 2026 DXOS.org
//

/**
 * A real `AuthorizedDevice` credential, signed by the protobuf.js codec and frozen here.
 *
 * Every credential ever issued is signed over the canonical stringification of its *decoded* shape,
 * so a shape change anywhere in the codec path silently invalidates all of them. The tests that
 * compare the two codecs cannot catch that: both regenerate from the same `src/proto` tree, so an
 * edit moves them together and they still agree. This vector is the missing half — bytes and signing
 * payload produced by a build that predates the change under test.
 *
 * Regenerate ONLY when the signature format is deliberately changing, which is a breaking change for
 * every existing space: it makes previously-issued credentials unverifiable.
 */
export const GOLDEN_CREDENTIAL_BYTES_B64 =
  'CiIKIBXMcvaJ4BsUnRjS19P2y016CQZxLVeLkx9g6jlb+5DWEkMKQQRkcRcIvjp2CuuBpIMgAtn02+1zrxAX87nMTQlfMdnWCpI7Ycb3o26P2b5RLHgyZditl+eg9BGbXCu62R4i1A8UGgwI9YeA1QYQgJCqiQFS/QEKQwpBBMbdDH30AOv4pfjk8Q0l7+y5eTqWOc/sMPIf+eAbhtaT+NDiqKGAh1jYMuTPZ3S2+VQPnOt+7L3b2sHPPEDLioUStQEKJmR4b3MuaGFsby5jcmVkZW50aWFscy5BdXRob3JpemVkRGV2aWNlEooBCkMKQQRkcRcIvjp2CuuBpIMgAtn02+1zrxAX87nMTQlfMdnWCpI7Ycb3o26P2b5RLHgyZditl+eg9BGbXCu62R4i1A8UEkMKQQTG3Qx99ADr+KX45PENJe/suXk6ljnP7DDyH/ngG4bWk/jQ4qihgIdY2DLkz2d0tvlUD5zrfuy929rBzzxAy4qFWqcBChBFRDI1NTE5U2lnbmF0dXJlEgwI9YeA1QYQgJCqiQEaQwpBBGRxFwi+OnYK64GkgyAC2fTb7XOvEBfzucxNCV8x2dYKkjthxvejbo/ZvlEseDJl2K2X56D0EZtcK7rZHiLUDxQqQDjUZ+l905/pUB/S7Y+qtrHZwyABNJxKUbv4yeWceptHaVa3rqNX7aXqPB9L1jq1vnHi0KkSPp7fWOV0r8bos+s=';

/** The exact bytes `getCredentialProofPayload` must produce for {@link GOLDEN_CREDENTIAL_BYTES_B64}. */
export const GOLDEN_CREDENTIAL_PROOF_PAYLOAD =
  '{"issuanceDate":"2026-09-08T12:47:49.288Z","issuer":"0464711708be3a760aeb81a4832002d9f4dbed73af1017f3b9cc4d095f31d9d60a923b61c6f7a36e8fd9be512c783265d8ad97e7a0f4119b5c2bbad91e22d40f14","proof":{"creationDate":"2026-09-08T12:47:49.288Z","signer":"0464711708be3a760aeb81a4832002d9f4dbed73af1017f3b9cc4d095f31d9d60a923b61c6f7a36e8fd9be512c783265d8ad97e7a0f4119b5c2bbad91e22d40f14","type":"ED25519Signature","value":""},"subject":{"assertion":{"deviceKey":"04c6dd0c7df400ebf8a5f8e4f10d25efecb9793a9639cfec30f21ff9e01b86d693f8d0e2a8a1808758d832e4cf6774b6f9540f9ceb7eecbddbdac1cf3c40cb8a85","identityKey":"0464711708be3a760aeb81a4832002d9f4dbed73af1017f3b9cc4d095f31d9d60a923b61c6f7a36e8fd9be512c783265d8ad97e7a0f4119b5c2bbad91e22d40f14"},"id":"04c6dd0c7df400ebf8a5f8e4f10d25efecb9793a9639cfec30f21ff9e01b86d693f8d0e2a8a1808758d832e4cf6774b6f9540f9ceb7eecbddbdac1cf3c40cb8a85"}}';

package credentials

import (
	"bytes"

	credentialspb "github.com/dxos/dxos/proto/def/dxos/halo/credentials"
	keyspb "github.com/dxos/dxos/proto/def/dxos/keys"
	"github.com/dxos/dxos/utils/keys"
)

const (
	VERIFICATION_RESULT_KIND_VALID   = "pass"
	VERIFICATION_RESULT_KIND_INVALID = "fail"
)

type VerificationResult struct {
	Kind   string
	Errors []string
}

func VerifyCredential(credential *credentialspb.Credential) (*VerificationResult, error) {
	if !bytes.Equal(credential.Issuer.Data, credential.Proof.Signer.Data) {
		if credential.Proof.Chain == nil {
			return &VerificationResult{
				Kind:   VERIFICATION_RESULT_KIND_INVALID,
				Errors: []string{"Delegated credential is missing credential chain."},
			}, nil
		}
		result, err := VerifyChain(credential.Proof.Chain, credential.Issuer, credential.Proof.Signer)
		if err != nil {
			return nil, err
		}
		if result.Kind == VERIFICATION_RESULT_KIND_INVALID {
			return result, nil
		}
	}

	return VerifyCredentialSignature(credential)
}

func VerifyCredentialSignature(credential *credentialspb.Credential) (*VerificationResult, error) {
	if credential.Proof.Type != SIGNATURE_TYPE_ED25519 {
		return &VerificationResult{
			Kind:   VERIFICATION_RESULT_KIND_INVALID,
			Errors: []string{"Invalid signature type: " + credential.Proof.Type},
		}, nil
	}

	signData, err := GetSignaturePayloadForCredential(credential)
	if err != nil {
		return nil, err
	}

	if !keys.VerifySignature(credential.Proof.Signer, signData, credential.Proof.Value) {
		return &VerificationResult{
			Kind:   VERIFICATION_RESULT_KIND_INVALID,
			Errors: []string{"Invalid signature"},
		}, nil
	}

	return &VerificationResult{
		Kind:   VERIFICATION_RESULT_KIND_VALID,
		Errors: []string{},
	}, nil
}

func VerifyChain(chain *credentialspb.Chain, authority *keyspb.PublicKey, subject *keyspb.PublicKey) (*VerificationResult, error) {
	return VerifyCredential(chain.Credential)
}

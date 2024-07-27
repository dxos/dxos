package credentials

import (
	credentialspb "github.com/dxos/kube/proto/def/dxos/halo/credentials"
	keyspb "github.com/dxos/kube/proto/def/dxos/keys"
	"github.com/dxos/kube/utils/keys"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type ProofArgs struct {
	signingPublicKey *keyspb.PublicKey
	signingFunc      func(data []byte) ([]byte, error)
	nonce            []byte
}

func CreatePresentation(
	credentials []*credentialspb.Credential,
	proofsToMake []*ProofArgs,
) (*credentialspb.Presentation, error) {

	presentation := &credentialspb.Presentation{
		Credentials: credentials,
		Proofs:      []*credentialspb.Proof{},
	}

	for _, proofToMake := range proofsToMake {
		proof := &credentialspb.Proof{
			Type:         SIGNATURE_TYPE_ED25519,
			CreationDate: timestamppb.Now(),
			Signer:       proofToMake.signingPublicKey,
			Value:        nil,
			Nonce:        proofToMake.nonce,
		}

		payloadToSign, err := GetSignaturePayloadForPresentation(credentials, proof)
		if err != nil {
			return nil, err
		}

		// Sign the payload.
		signature, err := proofToMake.signingFunc(payloadToSign)
		if err != nil {
			return nil, err
		}

		proof.Value = signature

		presentation.Proofs = append(presentation.Proofs, proof)
	}

	return presentation, nil
}

// Verifies only presentation layer, and does not verify the credentials.
func VerifyPresentation(presentation *credentialspb.Presentation) (*VerificationResult, error) {
	// Verify each proof.
	for _, proof := range presentation.Proofs {
		// Verify the signature.
		payloadToVerify, err := GetSignaturePayloadForPresentation(presentation.Credentials, proof)
		if err != nil {
			return nil, err
		}

		if !keys.VerifySignature(proof.Signer, payloadToVerify, proof.Value) {
			return &VerificationResult{
				Kind:   VERIFICATION_RESULT_KIND_INVALID,
				Errors: []string{"Invalid signature"},
			}, nil
		}
	}

	return &VerificationResult{
		Kind: VERIFICATION_RESULT_KIND_VALID,
	}, nil
}

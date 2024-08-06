package credentials

import (
	"crypto/sha256"
	"fmt"

	credentialspb "github.com/dxos/dxos/proto/def/dxos/halo/credentials"
	keyspb "github.com/dxos/dxos/proto/def/dxos/keys"
	anypb "google.golang.org/protobuf/types/known/anypb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

const (
	SIGNATURE_TYPE_ED25519 = "ED25519Signature"
)

func CreateCredential(
	issuer *keyspb.PublicKey,
	signingPublicKey *keyspb.PublicKey,
	signingFunc func(data []byte) ([]byte, error),
	subject *keyspb.PublicKey,
	assertion *anypb.Any,
	chain *credentialspb.Chain,
	nonce []byte,
) (*credentialspb.Credential, error) {
	// Verify chain.
	if chain != nil {
		res, err := VerifyChain(chain, issuer, signingPublicKey)
		if err != nil {
			return nil, err
		}
		if res.Kind == "fail" {
			return nil, fmt.Errorf("invalid chain: %v", res.Errors)
		}
	}

	credential := &credentialspb.Credential{
		Issuer:       issuer,
		IssuanceDate: timestamppb.Now(),
		Subject: &credentialspb.Claim{
			Id:        subject,
			Assertion: assertion,
		},
		Proof: &credentialspb.Proof{
			Type:         SIGNATURE_TYPE_ED25519,
			CreationDate: timestamppb.Now(),
			Signer:       signingPublicKey,
			Value:        nil,
			Nonce:        nonce,
		},
	}

	payloadToSign, err := GetSignaturePayloadForCredential(credential)

	if err != nil {
		return nil, err
	}

	// Sign the payload.
	signature, err := signingFunc(payloadToSign)
	if err != nil {
		return nil, err
	}

	credential.Proof.Value = signature

	if chain != nil {
		credential.Proof.Chain = chain
	}

	payloadHash := sha256.Sum256(payloadToSign)

	credential.Id = &keyspb.PublicKey{
		Data: payloadHash[:],
	}

	return credential, nil
}

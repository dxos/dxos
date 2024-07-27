package credentials

import (
	"encoding/base64"
	"fmt"
	"testing"

	credentialspb "github.com/dxos/dxos/proto/def/dxos/halo/credentials"
	"github.com/dxos/dxos/utils/keys"
	"google.golang.org/protobuf/proto"
	anypb "google.golang.org/protobuf/types/known/anypb"
)

func TestCredentialSigning(t *testing.T) {
	identityKeyPair := keys.NewKeyPair(nil)
	deviceKeyPair := keys.NewKeyPair(nil)

	assertionMessage := &credentialspb.AuthorizedDevice{
		IdentityKey: identityKeyPair.PublicKeyProto,
		DeviceKey:   deviceKeyPair.PublicKeyProto,
	}

	assertion, _ := anypb.New(assertionMessage)

	credential, _ := CreateCredential(
		identityKeyPair.PublicKeyProto,
		identityKeyPair.PublicKeyProto,
		identityKeyPair.Sign,
		deviceKeyPair.PublicKeyProto,
		assertion,
		nil,
		nil,
	)

	verified, _ := VerifyCredential(credential)

	if verified.Kind != "pass" {
		t.Fatalf("Unable to verify: %v", verified.Errors)
	}

	fmt.Printf("%s - OK\n", t.Name())
}

func TestWithHALOCredentials(t *testing.T) {
	// Credential created by js implementation.
	credAsBase64 := "CiIKIEaUxuNwqwU9W6vKDiZqkXfPfBG/7a5tqMC3fR4avOcSEkMKQQSVp5QYQd2ULmvw3YWcql2cOx2JPz113DZ9OBoXnGESzrks4vuHor0QHG/5vhMVpSSrvzC+uasNYc2Wo/wJpnmbGgsIt5vqngYQgM2kI1L9AQpDCkEEQdPFgnmDK2p46+A9q+9W5i9yQ8b2AwjMYD67LcEDmbPRdEc1eF2yG4bCL6W8As5f9fYOP7vTFkhndXf7jewNEBK1AQomZHhvcy5oYWxvLmNyZWRlbnRpYWxzLkF1dGhvcml6ZWREZXZpY2USigEKQwpBBJWnlBhB3ZQua/DdhZyqXZw7HYk/PXXcNn04GhecYRLOuSzi+4eivRAcb/m+ExWlJKu/ML65qw1hzZaj/AmmeZsSQwpBBEHTxYJ5gytqeOvgPavvVuYvckPG9gMIzGA+uy3BA5mz0XRHNXhdshuGwi+lvALOX/X2Dj+70xZIZ3V3+43sDRBapgEKEEVEMjU1MTlTaWduYXR1cmUSCwi3m+qeBhCAzaQjGkMKQQSVp5QYQd2ULmvw3YWcql2cOx2JPz113DZ9OBoXnGESzrks4vuHor0QHG/5vhMVpSSrvzC+uasNYc2Wo/wJpnmbKkD+fsztJtw/PYDAWZYlbKNXtDq92ZotPXkJlZnBopw3gF9lVtmNVLUD5be0lAtVS3pXrVTsp/AwGY0NyvLQyM4B"
	credAsBytes, _ := base64.StdEncoding.DecodeString(credAsBase64)

	credential := &credentialspb.Credential{}
	proto.Unmarshal(credAsBytes, credential)

	verified, _ := VerifyCredential(credential)
	if verified.Kind != "pass" {
		t.Fatalf("Unable to verify: %v", verified.Errors)
	}

	fmt.Printf("%s - OK\n", t.Name())
}

func TestPresentation(t *testing.T) {
	identityKeyPair := keys.NewKeyPair(nil)
	deviceKeyPair := keys.NewKeyPair(nil)

	assertionMessage := &credentialspb.AuthorizedDevice{
		IdentityKey: identityKeyPair.PublicKeyProto,
		DeviceKey:   deviceKeyPair.PublicKeyProto,
	}

	assertion, _ := anypb.New(assertionMessage)

	credential, _ := CreateCredential(
		identityKeyPair.PublicKeyProto,
		identityKeyPair.PublicKeyProto,
		identityKeyPair.Sign,
		deviceKeyPair.PublicKeyProto,
		assertion,
		nil,
		nil,
	)

	presentation, _ := CreatePresentation(
		[]*credentialspb.Credential{credential},
		[]*ProofArgs{
			{
				signingPublicKey: deviceKeyPair.PublicKeyProto,
				signingFunc:      deviceKeyPair.Sign,
				nonce:            []byte("nonce"),
			},
		},
	)

	verified, _ := VerifyPresentation(presentation)
	if verified.Kind != "pass" {
		t.Fatalf("Unable to verify: %v", verified.Errors)
	}

	fmt.Printf("%s - OK", t.Name())
}

func TestWithHALOPresentation(t *testing.T) {
	presentationAsBase64 := "CtsCCiIKIIX0ExZ3PriPHy6Mn6hipKtHtIAydVAysEUY/zsCWhl9EkMKQQRoQ5OJggF/Nvcqa7tTQyFlARM5u+TnP7sEkgBaOXk920ZQGXt24Ss554pF7kFFwqLkvs0Onya3muyObT8S08ThGgwIzZfNnwYQgIyEpAFSOAoGCgR0ZXN0Ei4KImV4YW1wbGUudGVzdGluZy5ycGMuTWVzc2FnZVdpdGhBbnkSCAoGEgR0ZXN0WqcBChBFRDI1NTE5U2lnbmF0dXJlEgwIzZfNnwYQgIyEpAEaQwpBBGhDk4mCAX829ypru1NDIWUBEzm75Oc/uwSSAFo5eT3bRlAZe3bhKznnikXuQUXCouS+zQ6fJrea7I5tPxLTxOEqQPLUbXSfLHmxBkmVIfgJeAU2ZcF7DpbHTB34pK5WbRwGJB1kAdxJzsJ00HCLjqt2kgDPyQZ5QUH6nh2Au1bEwRYS1AUKEEVEMjU1MTlTaWduYXR1cmUSDAjNl82fBhCAjISkARpDCkEEaEOTiYIBfzb3Kmu7U0MhZQETObvk5z+7BJIAWjl5PdtGUBl7duErOeeKRe5BRcKi5L7NDp8mt5rsjm0/EtPE4SIEAAAAACpAsh9I71azreb89BJkRPMvQox+l80ujVPKqsPhjtqOuAJUrAVAfHj7UJD3BEFEhh2UaZBOQmkPE0Ti3/72++ULGzKkBAqhBAoiCiDzT/AawqB2r/AblrY7bOhxLq4dFMu40ZFmiPcuvEhkkRJDCkEEjTc4VkLPQlcYd8+41V4wYqbVtw0NFPXPobpoi8VtBM7/YhOo2TTFlyjgtUuuNcJoPJWBSOv5smop+XqixiSZ0hoMCM2XzZ8GEICDiqMBUv0BCkMKQQRoQ5OJggF/Nvcqa7tTQyFlARM5u+TnP7sEkgBaOXk920ZQGXt24Ss554pF7kFFwqLkvs0Onya3muyObT8S08ThErUBCiZkeG9zLmhhbG8uY3JlZGVudGlhbHMuQXV0aG9yaXplZERldmljZRKKAQpDCkEEjTc4VkLPQlcYd8+41V4wYqbVtw0NFPXPobpoi8VtBM7/YhOo2TTFlyjgtUuuNcJoPJWBSOv5smop+XqixiSZ0hJDCkEEaEOTiYIBfzb3Kmu7U0MhZQETObvk5z+7BJIAWjl5PdtGUBl7duErOeeKRe5BRcKi5L7NDp8mt5rsjm0/EtPE4VqnAQoQRUQyNTUxOVNpZ25hdHVyZRIMCM2XzZ8GEICDiqMBGkMKQQSNNzhWQs9CVxh3z7jVXjBiptW3DQ0U9c+humiLxW0Ezv9iE6jZNMWXKOC1S641wmg8lYFI6/myain5eqLGJJnSKkBSp9cV6PWpeLlR0Nu1E4KyeXhzoA+JheXZSTQVpbp8hPLV1cTKPwIATmxri+KVoNVPOVjgkdWIUdDwnsgH2NUL"
	presentationAsBytes, _ := base64.StdEncoding.DecodeString(presentationAsBase64)

	presentation := &credentialspb.Presentation{}
	proto.Unmarshal(presentationAsBytes, presentation)

	verified, _ := VerifyPresentation(presentation)
	if verified.Kind != "pass" {
		t.Fatalf("Unable to verify: %v", verified.Errors)
	}

	fmt.Printf("%s - OK", t.Name())
}

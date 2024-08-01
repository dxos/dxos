package keys

import (
	"fmt"
	"testing"
)

func TestKeysMarchalling(t *testing.T) {
	keypair := NewKeyPair(nil)

	messageToSign := []byte("hello world")

	signature, err := keypair.Sign(messageToSign)

	if err != nil {
		t.Fatalf("Unable to sign: %v", err)
	}

	keyPairAsBytes, err := keypair.Marchal()
	if err != nil {
		t.Fatalf("Unable to marchal: %v", err)
	}

	keyPairFromByts := NewKeyPairFromBytes(keyPairAsBytes)
	if err != nil {
		t.Fatalf("Unable to unmarshal: %v", err)
	}

	verified := VerifySignature(keyPairFromByts.PublicKeyProto, messageToSign, signature)
	if !verified {
		t.Fatalf("Unable to verify")
	}

	fmt.Printf("%s - OK\n", t.Name())
}

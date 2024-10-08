package keys

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/big"

	keyspb "github.com/dxos/dxos/proto/def/dxos/keys"
)

type KeyPair struct {
	PrivateKey     *ecdsa.PrivateKey
	PublicKey      *ecdsa.PublicKey
	PublicKeyProto *keyspb.PublicKey
}

var CURVE = elliptic.P256()

const CURVE_SIGNATURE_LENGTH = 64

func NewKeyPairFromBytes(privateKeyBytes []byte) *KeyPair {
	privateKey := new(ecdsa.PrivateKey)
	privateKey.PublicKey.Curve = CURVE
	privateKey.D = new(big.Int).SetBytes(privateKeyBytes)
	privateKey.PublicKey.X, privateKey.PublicKey.Y = privateKey.PublicKey.Curve.ScalarBaseMult(privateKeyBytes)
	return &KeyPair{
		PrivateKey: privateKey,
		PublicKey:  &privateKey.PublicKey,
		PublicKeyProto: &keyspb.PublicKey{
			Data: elliptic.Marshal(CURVE, privateKey.PublicKey.X, privateKey.PublicKey.Y),
		},
	}
}

func NewKeyPair(privateKey *ecdsa.PrivateKey) *KeyPair {
	if privateKey == nil {
		privateKey, _ = ecdsa.GenerateKey(CURVE, rand.Reader)
	}
	publicKeyData := elliptic.Marshal(CURVE, privateKey.PublicKey.X, privateKey.PublicKey.Y)
	return &KeyPair{
		PrivateKey: privateKey,
		PublicKey:  &privateKey.PublicKey,
		PublicKeyProto: &keyspb.PublicKey{
			Data: publicKeyData,
		},
	}
}

func (kp *KeyPair) Sign(data []byte) ([]byte, error) {
	hash := sha256.Sum256(data)
	r, s, err := ecdsa.Sign(rand.Reader, kp.PrivateKey, hash[:])
	if err != nil {
		return nil, err
	}
	rBytes := make([]byte, CURVE_SIGNATURE_LENGTH/2)
	sBytes := make([]byte, CURVE_SIGNATURE_LENGTH/2)
	r.FillBytes(rBytes)
	s.FillBytes(sBytes)
	sig := make([]byte, CURVE_SIGNATURE_LENGTH)
	copy(sig[:CURVE_SIGNATURE_LENGTH/2], rBytes)
	copy(sig[CURVE_SIGNATURE_LENGTH/2:], sBytes)
	return sig, nil
}

func (kp *KeyPair) Marchal() ([]byte, error) {
	return kp.PrivateKey.D.Bytes(), nil
}

func VerifySignature(publicKey *keyspb.PublicKey, data []byte, signature []byte) bool {
	x, y := elliptic.Unmarshal(CURVE, publicKey.Data)
	pub := &ecdsa.PublicKey{X: x, Y: y, Curve: CURVE}

	rBytes, sBytes := signature[:CURVE_SIGNATURE_LENGTH/2], signature[CURVE_SIGNATURE_LENGTH/2:]
	r := new(big.Int).SetBytes(rBytes)
	s := new(big.Int).SetBytes(sBytes)

	hash := sha256.Sum256(data)
	return ecdsa.Verify(pub, hash[:], r, s)
}

func NewPublicKeyFromHex(hexKey string) (*keyspb.PublicKey, error) {
	pubKeyBytes, err := hex.DecodeString(hexKey)
	if err != nil {
		return nil, fmt.Errorf("failed to decode hex string: %w", err)
	}

	return &keyspb.PublicKey{
		Data: pubKeyBytes,
	}, nil

}

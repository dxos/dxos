package credentials

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"

	credentialspb "github.com/dxos/kube/proto/def/dxos/halo/credentials"
	"github.com/dxos/kube/proto/def/example/testing/rpc"
	"google.golang.org/protobuf/proto"
	anypb "google.golang.org/protobuf/types/known/anypb"
	timestamppb "google.golang.org/protobuf/types/known/timestamppb"
)

const (
	TIME_FORMAT = "2006-01-02T15:04:05.999Z"
)

func formatDateTime(t *timestamppb.Timestamp) string {
	dateTime := t.AsTime().Format(TIME_FORMAT)
	if strings.LastIndex(dateTime, ".") == len(dateTime)-4 {
		dateTime = dateTime[:len(dateTime)-1] + "0" + dateTime[len(dateTime)-1:]
	}
	return dateTime
}

type ChainToStringify struct {
	Credential *CredentialToStringify `json:"credential"`
}

type ProofToStringify struct {
	Chain        *ChainToStringify `json:"chain,omitempty"`
	CreationDate string            `json:"creationDate"`
	Nonce        string            `json:"nonce,omitempty"`
	Signer       string            `json:"signer"`
	Type         string            `json:"type"`
	Value        string            `json:"value"`
}

type CredentialToStringify struct {
	Id           string              `json:"id,omitempty"`
	IssuanceDate string              `json:"issuanceDate"`
	Issuer       string              `json:"issuer"`
	Proof        *ProofToStringify   `json:"proof"`
	Subject      *SubjectToStrinfigy `json:"subject"`
}

type SubjectToStrinfigy struct {
	Assertion interface{} `json:"assertion"`
	Id        string      `json:"id"`
}

type AuthorizedDeviceToStringify struct {
	DeviceKey   string `json:"deviceKey"`
	IdentityKey string `json:"identityKey"`
}

type KubeAccessToStringify struct {
	Capabilities []string `json:"capabilities"`
	IdentityKey  string   `json:"identityKey"`
	KubeKey      string   `json:"kubeKey"`
}

type ServiceAccessToStringify struct {
	Capabilities   []string    `json:"capabilities"`
	IdentityKey    string      `json:"identityKey"`
	ServerKey      string      `json:"serverKey"`
	ServerMetadata interface{} `json:"serverMetadata"`
	ServerName     string      `json:"serverName"`
}

type MessageWithAnyToStringify struct {
	Payload *MessageWithAnyPayloadToStringify `json:"payload"`
}

type MessageWithAnyPayloadToStringify struct {
	Value string `json:"value"`
}

type PresentationToStringify struct {
	Credentials []*CredentialToStringify `json:"credentials"`
	Proof       *ProofToStringify        `json:"proof"`
}

func credToCredToStringify(cred *credentialspb.Credential, includeAllFields, includeChain bool) *CredentialToStringify {
	assertion, _ := GetAssertionToStrinfigy(cred.Subject.Assertion)
	value := ""
	if includeAllFields {
		value = hex.EncodeToString(cred.Proof.Value)
	}

	var chain *ChainToStringify
	if cred.Proof.Chain != nil && includeChain {
		chain = &ChainToStringify{Credential: credToCredToStringify(cred.Proof.Chain.Credential, includeAllFields, includeChain)}
	}

	result := &CredentialToStringify{
		IssuanceDate: formatDateTime(cred.IssuanceDate),
		Issuer:       hex.EncodeToString(cred.Issuer.Data),
		Proof: &ProofToStringify{
			CreationDate: formatDateTime(cred.Proof.CreationDate),
			Nonce:        hex.EncodeToString(cred.Proof.Nonce),
			Signer:       hex.EncodeToString(cred.Proof.Signer.Data),
			Type:         cred.Proof.Type,
			Value:        value,
			Chain:        chain,
		},
		Subject: &SubjectToStrinfigy{
			Assertion: assertion,
			Id:        hex.EncodeToString(cred.Subject.Id.Data),
		},
	}

	if includeAllFields && cred.Id != nil {
		result.Id = hex.EncodeToString(cred.Id.Data)
	}

	return result
}

func GetAssertionToStrinfigy(assertion *anypb.Any) (interface{}, error) {
	if assertion == nil {
		return nil, nil
	}

	assertionType := assertion.TypeUrl[strings.LastIndex(assertion.TypeUrl, ".")+1:]

	switch assertionType {
	case "AuthorizedDevice":
		var assertionMessage credentialspb.AuthorizedDevice
		anypb.UnmarshalTo(assertion, &assertionMessage, proto.UnmarshalOptions{})
		return &AuthorizedDeviceToStringify{
			DeviceKey:   hex.EncodeToString(assertionMessage.DeviceKey.Data),
			IdentityKey: hex.EncodeToString(assertionMessage.IdentityKey.Data),
		}, nil

	case "MessageWithAny":
		var assertionMessage rpc.MessageWithAny
		anypb.UnmarshalTo(assertion, &assertionMessage, proto.UnmarshalOptions{})
		return &MessageWithAnyToStringify{
			Payload: &MessageWithAnyPayloadToStringify{
				Value: hex.EncodeToString(assertionMessage.Payload.Value),
			},
		}, nil

	case "KubeAccess":
		var assertionMessage credentialspb.KubeAccess
		anypb.UnmarshalTo(assertion, &assertionMessage, proto.UnmarshalOptions{})
		capabilities := []string{}
		if assertionMessage.Capabilities != nil {
			capabilities = assertionMessage.Capabilities
		}
		return &KubeAccessToStringify{
			Capabilities: capabilities,
			IdentityKey:  hex.EncodeToString(assertionMessage.IdentityKey.Data),
			KubeKey:      hex.EncodeToString(assertionMessage.KubeKey.Data),
		}, nil

	case "ServiceAccess":
		var assertionMessage credentialspb.ServiceAccess
		anypb.UnmarshalTo(assertion, &assertionMessage, proto.UnmarshalOptions{})
		capabilities := []string{}
		if assertionMessage.Capabilities != nil {
			capabilities = assertionMessage.Capabilities
		}
		return &ServiceAccessToStringify{
			Capabilities:   capabilities,
			IdentityKey:    hex.EncodeToString(assertionMessage.IdentityKey.Data),
			ServerKey:      hex.EncodeToString(assertionMessage.ServerKey.Data),
			ServerMetadata: assertionMessage.ServerMetadata,
			ServerName:     assertionMessage.ServerName,
		}, nil

	default:
		return nil, fmt.Errorf("unsupported assertion type: %s", assertion.TypeUrl)
	}
}

func GetSignaturePayloadForCredential(credential *credentialspb.Credential) ([]byte, error) {
	credToStrinfigy := credToCredToStringify(credential, false, false)

	return json.Marshal(credToStrinfigy)
}

func GetSignaturePayloadForPresentation(credentials []*credentialspb.Credential, proof *credentialspb.Proof) ([]byte, error) {
	credsToStrinfigy := make([]*CredentialToStringify, len(credentials))

	for i, credential := range credentials {
		credsToStrinfigy[i] = credToCredToStringify(credential, true, true)
	}

	proofToStringify := &ProofToStringify{
		CreationDate: formatDateTime(proof.CreationDate),
		Nonce:        hex.EncodeToString(proof.Nonce),
		Signer:       hex.EncodeToString(proof.Signer.Data),
		Type:         proof.Type,
		Value:        "",
	}

	return json.Marshal(&PresentationToStringify{
		Credentials: credsToStrinfigy,
		Proof:       proofToStringify,
	})
}

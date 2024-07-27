package dxrpc

/*
type DXOSError struct {
	code string
	err  error
}

func (e *DXOSError) Error() string {
	if e.code == "" {
		return e.err.Error()
	}
	return fmt.Sprintf("%s: %v", e.code, e.err)
}

func (e *DXOSError) Unwrap() error {
	return e.err
}

func (e *DXOSError) Code() string {
	return e.code
}

func (e *DXOSError) Message() string {
	return e.err.Error()
}

func (e *DXOSError) AsPBError() *errorpb.Error {
	errorMsg := e.err.Error()
	return &errorpb.Error{
		Name:    &e.code,
		Message: &errorMsg,
	}
}

func NewDXOSError(code string, err error) *DXOSError {
	return &DXOSError{code: code, err: err}
}

// errRateLimitExceeded := Errors.new("RATE_LIMIT_EXCEEDED")
*/

import (
	"fmt"

	errorpb "github.com/dxos/kube/proto/def/dxos/error"
)

// type alias necessary to avoid clash with Error() method
type PBError = errorpb.Error

var _ error = (*RPCError)(nil)

type RPCError struct {
	err error
	*PBError
}

func NewRPCError(code string, err error) *RPCError {
	msg := err.Error()
	return &RPCError{PBError: &PBError{Name: &code, Message: &msg}, err: err}
}

func (e *RPCError) Error() string {
	if e.PBError.Name != nil && *(e.PBError.Name) == "" {
		return e.err.Error()
	}
	return fmt.Sprintf("%s: %v", *(e.PBError.Name), e.err)

}

func (e *RPCError) ErrorAsPB() *errorpb.Error {
	return e.PBError
}

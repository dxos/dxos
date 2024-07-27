package test

import (
	"context"

	"github.com/dxos/kube/dxrpc"

	"testing"

	dxrpcpb "github.com/dxos/kube/proto/def/example/testing/rpc"
	"google.golang.org/protobuf/types/known/emptypb"
)

type srv struct {
	dxrpcpb.UnimplementedTestServiceServer
}

func (s srv) TestCall(_ context.Context, request *dxrpcpb.TestRpcRequest) (*dxrpcpb.TestRpcResponse, error) {
	return &dxrpcpb.TestRpcResponse{Data: request.Data}, nil
}

func (s srv) VoidCall(_ context.Context, _ *emptypb.Empty) (*emptypb.Empty, error) {
	return &emptypb.Empty{}, nil
}

func TestSymmetry(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	p1 := dxrpc.NewRpcPeer()
	dxrpcpb.RegisterTestServiceServer(p1, srv{})

	p2 := dxrpc.NewRpcPeer()
	dxrpcpb.RegisterTestServiceServer(p2, srv{})

	a, b := dxrpc.NewChanPair()
	c1 := dxrpcpb.NewTestServiceClient(p1.Connect(ctx, a, b))
	c2 := dxrpcpb.NewTestServiceClient(p2.Connect(ctx, b, a))

	r1, err := c1.TestCall(ctx, &dxrpcpb.TestRpcRequest{Data: "foo"})
	if err != nil || r1.Data != "foo" {
		t.Fatal("c1 TestCall failed")
	}

	r2, err := c2.TestCall(ctx, &dxrpcpb.TestRpcRequest{Data: "bar"})
	if err != nil || r2.Data != "bar" {
		t.Fatal("c2 TestCall failed")
	}
}

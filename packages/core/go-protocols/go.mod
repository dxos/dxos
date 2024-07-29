module github.com/dxos/dxos/proto

go 1.21.0

toolchain go1.21.7

require (
	github.com/dxos/dxos/dxrpc v0.0.0-00010101000000-000000000000
	google.golang.org/protobuf v1.33.0
)

require golang.org/x/net v0.17.0 // indirect

require (
	github.com/gorilla/websocket v1.5.1 // indirect
	go.uber.org/multierr v1.11.0 // indirect; inmesh/go-rpcdirect
	go.uber.org/zap v1.26.0 // indirect
)

replace github.com/dxos/dxos/dxrpc => ../mesh/go-rpc

//go:generate protoc --experimental_allow_proto3_optional -I=../protocols/src/proto --go_out=. --go_opt=module=github.com/dxos/dxos/proto dxos/keys.proto
//go:generate protoc --experimental_allow_proto3_optional -I=../protocols/src/proto --go_out=. --go_opt=module=github.com/dxos/dxos/proto dxos/config.proto
//go:generate protoc --experimental_allow_proto3_optional -I=../protocols/src/proto --go_out=. --go_opt=module=github.com/dxos/dxos/proto dxos/error.proto
//go:generate protoc --experimental_allow_proto3_optional -I=../protocols/src/proto --go_out=. --go_opt=module=github.com/dxos/dxos/proto dxos/rpc.proto
//go:generate protoc --experimental_allow_proto3_optional -I=../protocols/src/proto --go_out=. --go_opt=module=github.com/dxos/dxos/proto dxos/echo/timeframe.proto
//go:generate protoc --experimental_allow_proto3_optional -I=../protocols/src/proto --go_out=. --go_opt=module=github.com/dxos/dxos/proto dxos/halo/credentials.proto
//go:generate protoc -I=../protocols/src/proto --go_out=. --go_opt=module=github.com/dxos/dxos/proto --go-dxrpc_out=. --go-dxrpc_opt=module=github.com/dxos/dxos/proto dxos/service/publisher.proto
//go:generate protoc -I=../protocols/src/proto --go_out=. --go_opt=module=github.com/dxos/dxos/proto --go-dxrpc_out=. --go-dxrpc_opt=module=github.com/dxos/dxos/proto dxos/service/tunnel.proto
//go:generate protoc -I=../protocols/src/proto --go_out=. --go_opt=module=github.com/dxos/dxos/proto --go-dxrpc_out=. --go-dxrpc_opt=module=github.com/dxos/dxos/proto dxos/mesh/signal.proto
//go:generate protoc -I=../protocols/src/proto --go_out=. --go_opt=module=github.com/dxos/dxos/proto --go-dxrpc_out=. --go-dxrpc_opt=module=github.com/dxos/dxos/proto dxos/service/supervisor.proto
//go:generate protoc -I=../protocols/src/proto --go_out=. --go_opt=module=github.com/dxos/dxos/proto --go-dxrpc_out=. --go-dxrpc_opt=module=github.com/dxos/dxos/proto dxos/service/agentmanager.proto
//go:generate protoc -I=../protocols/src/proto --go_out=. --go_opt=module=github.com/dxos/dxos/proto --go-dxrpc_out=. --go-dxrpc_opt=module=github.com/dxos/dxos/proto example/testing/rpc.proto
package dxos

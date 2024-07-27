module github.com/dxos/dxos/utils/keys

go 1.21.0

toolchain go1.21.7

require github.com/dxos/dxos/proto v0.0.0-00010101000000-000000000000

require google.golang.org/protobuf v1.33.0 // indirect

replace github.com/dxos/dxos/proto => ../../core/protocols

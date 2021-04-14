set -e

# Generate protobuf definitions
mkdir -p src/proto/gen && build-protobuf src/proto/defs/dxos.proto -s src/proto/substitutions.ts -o src/proto/gen

# Typescript build
tsc

# Lint
eslint 'src/**/*.ts'

# Test
jest 'src/**/*.test.ts'

set -e

TOOLCHAIN_DIR=$(dirname "$0")

PATH="$TOOLCHAIN_DIR/node_modules/.bin:$PATH"

# Generate protobuf definitions
mkdir -p src/proto/gen
build-protobuf src/proto/defs/dxos.proto -s src/proto/substitutions.ts -o src/proto/gen

# Typescript build
tsc

# Lint
eslint --config "$TOOLCHAIN_DIR/.eslintrc.js" 'src/**/*.ts'

# Test
# jest 'src/**/*.test.ts'

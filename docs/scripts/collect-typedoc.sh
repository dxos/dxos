#!/bin/bash

packages=(
    "sdk/app-framework"
    "sdk/client"
    "sdk/react-client"
)

mkdir -p ./public/typedoc

for package in "${packages[@]}"; do
    echo "Collecting typedoc for $package"
    package_name=$(basename "$package")
    rm -rf ./public/typedoc/"$package_name"
    cp -r ../packages/"$package"/typedoc ./public/typedoc/"$package_name"
done

#!/bin/bash

packages=(
    "core/compute/compute"
    "core/echo/echo"
    "core/echo/echo-react"
    "core/echo/echo-solid"
    "core/halo/halo"
    "core/halo/halo-react"
    "sdk/app-framework"
    "sdk/app-graph"
    "sdk/app-toolkit"
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

#/bin/sh

set -e

apt-get update
apt-get install -y autoconf automake make g++ libtool libxtst-dev libpng-dev libx11-dev
apt-get install -y gstreamer1.0-plugins-bad libenchant1c2a gstreamer1.0-libav #webkit dependencies

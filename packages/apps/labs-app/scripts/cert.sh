#!/bin/bash

# TODO(burdon): Factor out (but not working).
# See REPOSITORY_GUIDE

mkcert -install
mkcert localhost $(ipconfig getifaddr en1)
mv localhost+1-key.pem key.pem
mv localhost+1.pem cert.pem

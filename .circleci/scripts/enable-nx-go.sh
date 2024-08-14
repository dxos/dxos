#!/usr/bin/env bash

cat <<EOF | patch -p1
diff --git b/nx.json a/nx.json
index 987374c4e1..8adba05057 100644
--- b/nx.json
+++ a/nx.json
@@ -271,5 +271,6 @@
     "storybook-build": {
       "cache": true
     }
-  }
+  },
+  "plugins": ["@nx-go/nx-go"]
 }
EOF

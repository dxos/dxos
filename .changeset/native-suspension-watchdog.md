---
'@dxos/app-framework': patch
---

Count the startup deadline in observed execution time instead of wall clock, so a boot overlapping process suspension (a hidden native-app webview, App Nap, system sleep) no longer raises the fatal startup-timeout dialog. The native app also disables WKWebView background throttling, which suspended every JS realm for hours once the window sat hidden.

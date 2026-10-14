//
// Copyright 2026 DXOS.org
//

// System-WebKit host for the Composer bundle: the engine the native app runs, behind a CONNECT proxy.
// Usage: wkapp <proxy-port> <data-store-uuid> <file-for-open-panel>
// Commands on stdin, one JSON object per line: {"id","op":"load","url"} | {"id","op":"eval","js"}
// Replies on stdout, one JSON object per line: {"id","ok","value"|"error"}.
import AppKit
import Network
import WebKit

func reply(_ object: [String: Any]) {
  let data = try! JSONSerialization.data(withJSONObject: object)
  FileHandle.standardOutput.write(data)
  FileHandle.standardOutput.write("\n".data(using: .utf8)!)
}

func setPrivateBool(_ target: NSObject, _ selector: String, _ value: Bool) {
  let sel = NSSelectorFromString(selector)
  guard target.responds(to: sel) else {
    FileHandle.standardError.write("missing \(selector)\n".data(using: .utf8)!)
    return
  }
  typealias Setter = @convention(c) (AnyObject, Selector, Bool) -> Void
  unsafeBitCast(target.method(for: sel), to: Setter.self)(target, sel, value)
}

final class Host: NSObject, WKNavigationDelegate, WKUIDelegate {
  let web: WKWebView
  let window = NSWindow(contentRect: NSRect(x: -3000, y: -3000, width: 1440, height: 900), styleMask: [.borderless], backing: .buffered, defer: false)
  let pickFile: URL
  var pendingLoad: String?

  init(proxyPort: UInt16, store: UUID, pickFile: URL) {
    self.pickFile = pickFile
    let config = WKWebViewConfiguration()
    let dataStore = WKWebsiteDataStore(forIdentifier: store)
    var proxy = ProxyConfiguration(httpCONNECTProxy: NWEndpoint.hostPort(host: "127.0.0.1", port: NWEndpoint.Port(rawValue: proxyPort)!))
    proxy.excludedDomains = ["127.0.0.1", "localhost"]
    proxy.allowFailover = false
    dataStore.proxyConfigurations = [proxy]
    config.websiteDataStore = dataStore
    // As the native app: a visible window's timers, never the hidden-page throttle.
    setPrivateBool(config.preferences, "_setHiddenPageDOMTimerThrottlingEnabled:", false)
    setPrivateBool(config.preferences, "_setPageVisibilityBasedProcessSuppressionEnabled:", false)
    web = WKWebView(frame: NSRect(x: 0, y: 0, width: 1440, height: 900), configuration: config)
    super.init()
    setPrivateBool(web, "_setWindowOcclusionDetectionEnabled:", false)
    web.navigationDelegate = self
    web.uiDelegate = self
    window.contentView = web
    window.orderFrontRegardless()
  }

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    if let id = pendingLoad {
      pendingLoad = nil
      reply(["id": id, "ok": true])
    }
  }

  func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
    if let id = pendingLoad {
      pendingLoad = nil
      reply(["id": id, "ok": false, "error": error.localizedDescription])
    }
  }

  func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
    self.webView(webView, didFail: navigation, withError: error)
  }

  func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
    completionHandler([pickFile])
  }

  func handle(_ line: String) {
    guard let data = line.data(using: .utf8),
          let command = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let id = command["id"] as? String,
          let op = command["op"] as? String else { return }
    switch op {
    case "load":
      pendingLoad = id
      web.load(URLRequest(url: URL(string: command["url"] as! String)!))
    case "eval":
      web.callAsyncJavaScript(command["js"] as! String, arguments: [:], in: nil, in: .page) { result in
        switch result {
        case .success(let value):
          // The driver returns JSON text, so the value crosses as a string.
          reply(["id": id, "ok": true, "value": (value as? String) ?? String(describing: value)])
        case .failure(let error):
          reply(["id": id, "ok": false, "error": String(describing: error)])
        }
      }
    default:
      reply(["id": id, "ok": false, "error": "unknown op"])
    }
  }

  func readLoop() {
    DispatchQueue.global().async {
      while let line = readLine() {
        DispatchQueue.main.async { self.handle(line) }
      }
      DispatchQueue.main.async { exit(0) }
    }
  }
}

let args = CommandLine.arguments
if args[1] == "--remove" {
  // Deletes a data store (the imported profile's storage) once nothing uses it.
  WKWebsiteDataStore.remove(forIdentifier: UUID(uuidString: args[2])!) { error in
    reply(["id": "removed", "ok": error == nil, "error": error.map { String(describing: $0) } ?? ""])
    exit(error == nil ? 0 : 1)
  }
  RunLoop.main.run()
}
let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let host = Host(proxyPort: UInt16(args[1])!, store: UUID(uuidString: args[2])!, pickFile: URL(fileURLWithPath: args[3]))
host.readLoop()
reply(["id": "ready", "ok": true])
app.run()

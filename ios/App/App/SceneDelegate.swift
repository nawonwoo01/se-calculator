import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        let controller = CAPBridgeViewController()
        window?.rootViewController = controller
        window?.makeKeyAndVisible()

        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--se-ui-smoke") {
            print("SE_UI_PROBE_STARTED")
            fflush(stdout)
            verifySmokePage(controller)
        }
        #endif

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }

    #if DEBUG
    // Explicit CI launch flag only; no test inputs run during normal use or Release builds.
    private func verifySmokePage(_ controller: CAPBridgeViewController, attempt: Int = 0) {
        guard attempt < 120 else { print("SE_UI_NOT_READY: timed out"); fflush(stdout); return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { [weak self, weak controller] in
            guard let self = self, let controller = controller else { return }
            guard let webView = controller.webView else {
                self.verifySmokePage(controller, attempt: attempt + 1); return
            }
            let probe = """
            (() => {
              if (document.readyState !== 'complete' || !document.getElementById('appVersion') || !window.SECore) return 'pending';
              if (window.SE_RELEASE?.native !== true || document.getElementById('admin')) return 'failure: native configuration';
              for (const [id, value] of [['wt', '60'], ['ht', '170']]) {
                const input = document.getElementById(id);
                input.value = value; input.dispatchEvent(new Event('input', { bubbles: true }));
              }
              if (document.getElementById('rateOut').textContent !== '10 mL/hr') return 'failure: infusion calculation';
              if (document.getElementById('asmLoadOut').textContent !== '3600 mg') return 'failure: ASM calculation';
              return 'ok';
            })()
            """
            webView.evaluateJavaScript(probe) { result, error in
                if let result = result as? String, result == "ok" {
                    print("SE_UI_READY: native page, infusion 10 mL/hr, ASM 3600 mg")
                    fflush(stdout)
                } else if let result = result as? String, result.hasPrefix("failure:") {
                    print("SE_UI_FAILURE: \(result)")
                    fflush(stdout)
                } else {
                    if let error = error { print("SE_UI_RETRY: \(error.localizedDescription)") }
                    fflush(stdout)
                    self.verifySmokePage(controller, attempt: attempt + 1)
                }
            }
        }
    }
    #endif
}

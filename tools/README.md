# tools

Verification harness for CHIEFTAIN. No dependencies — Node 24 has a global
`WebSocket`, so these drive installed Chrome over the DevTools protocol directly.

These used to live in a session scratchpad and were lost every time. They are in
the repo now because visual verification has repeatedly caught bugs that headless
DOM tests did not.

Serve the app first:

    cd src && python -m http.server 8777

Then, **always with `MSYS_NO_PATHCONV=1` under Git Bash** — without it the shell
rewrites `#/route` arguments into Windows paths and every route silently renders
as the hub:

    MSYS_NO_PATHCONV=1 node tools/shot.mjs  http://localhost:8777/index.html / /games /table/wheel
    MSYS_NO_PATHCONV=1 node tools/a11y.mjs  http://localhost:8777/index.html / /games /ladder /chips /rules /vault /table/wheel
    MSYS_NO_PATHCONV=1 node tools/belt.mjs  http://localhost:8777/index.html
    MSYS_NO_PATHCONV=1 node tools/seam.mjs  http://localhost:8777/index.html

`extract.mjs` measures another site's real design tokens — colours, type, radii,
shadows, tracking — instead of matching them by eye:

    node tools/extract.mjs https://example.com out.json

## Traps these already handle

- **`:focus-visible` does not match a programmatic `.focus()`.** Test focus with
  real Tab keypresses via `Input.dispatchKeyEvent` or you will "discover" that
  every control in the app is broken.
- **`backgroundColor` is transparent on gradient elements.** A contrast probe has
  to read `backgroundImage`'s first stop, or it invents ~1:1 ratios that do not exist.
- **Headless Chrome clamps the window to 500px minimum on Windows.** Use
  `Emulation.setDeviceMetricsOverride`, never `--window-size=390`, or a phone
  layout renders at 500 and looks catastrophically broken when it is fine.
- **Disable the network cache.** Otherwise an edited module is silently not reloaded
  and you screenshot the previous build.

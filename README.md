# Mantra Music Player

Offline-ready web app for playing `mantra.wav` with a 108 play counter.

## Use Offline

1. Keep these files in the same folder:
   - `index.html`
   - `style.css`
   - `script.js`
   - `manifest.webmanifest`
   - `sw.js`
   - `icon.svg`
   - `mantra.wav`
2. Open `index.html` in a browser to use the player offline from the folder.

## Install As An App

For the browser install button to appear, open the folder through a local server or host it on HTTPS once. After the first load, the service worker caches the player and `mantra.wav` for offline use.

Local server example:

```powershell
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

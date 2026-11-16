# Fachfinder · Workshop Bin Finder

Fachfinder helps a volunteer find the right bin in a shared workshop. Pick a tool, open a shelf photo and confirm the physical bin. The interface highlights the decoded QR label that matches the inventory entry.

## Try the local version

```sh
npm ci
npm test
npm run build
npm start
```

Open `http://127.0.0.1:5733/`. Use Node.js 22 or later. The app interface is in German. The `dist/` directory is a self-contained static site and does not require a server-side API. The development server listens only on your computer.

### Jury walkthrough

1. On the default shelf photo, verify that `6 Fächer erkannt` means six bins were detected.
2. Search for `imbus` and select `Inbusschlüssel 5 mm` (5 mm hex key). The app highlights `A-02`.
3. Choose `Einzelfach testen` (single-bin test). The close-up shows bin `A-01`. The results panel explains the mismatch and does not offer the confirmation button.
4. Choose `Beispielregal` (sample shelf) and then `Fach bestätigen` (confirm bin). The match now appears in `Letzte Bestätigungen` (recent confirmations).
5. Choose `QR-Etiketten drucken` (print QR labels) to see the six printable codes. Choose `Foto auswählen` (choose photo) to try an image from your own device, such as a photo of a printed label.

## Implementation

The browser decodes QR markers locally with jsQR. The scanner checks the image and overlapping crops so that a photo can contain several bins. It accepts only known `FACHFINDER:A-01` through `FACHFINDER:B-03` identifiers. Each valid code gives the app its decoded bin and coordinates, which lets the app show the source of its match. The inventory is a small fictional sample maintained in `public/inventory.mjs`. The marker verifies the bin identifier. The inventory count and the actual contents have to be verified separately in a workshop.

Photos and CSV files are processed locally. Open `Eigenes Inventar importieren` (import your inventory) to download the sample CSV, choose a revised CSV file and review its first five entries. `Inventar ersetzen` applies the preview and clears confirmation history. It accepts up to 200 items for the demo's six bin identifiers. The saved custom inventory and a six-entry confirmation history are local to the current browser. The printable labels and all image assets are shipped with the build. There is no account requirement or model API. Image formats are limited to those the browser can decode. Dark rooms, distant labels and small or damaged QR codes may prevent detection.

## Originality and provenance

The original sample shelf photo was generated using OpenAI ImageGen with a brief for an unbranded, front-facing workshop rack and six plain bins. Real QR stickers were composed onto the image with a project script. `scripts/make-samples.mjs` accepts the unlabelled PNG source and creates the demo photo, close-up and print labels. The finished images are already included. The prototype was authored with assistance from Codex during the Kiroween 2026 submission period. Kiro CLI 3.3.0 used Claude Sonnet 4.5 on the Free plan in an isolated copy and generated the [inventory import specification](.kiro/specs/inventory-import/requirements.md) and a concrete parser and browser integration proposal. The local runner did not grant Kiro direct filesystem write permission. Codex applied and reviewed the implementation, tightened parsing and field validation, and ran the checks.

Research references include the [Kiroween 2025 winners gallery](https://kiroween-2025.devpost.com/project-gallery), particularly UnitSet, InteractionKit and Faxi. No code, visual asset or text from those projects was reused.

jsQR is Apache-2.0 licensed. The build carries its license alongside the browser dependency. The optional image generation script uses `qrcode` and `pngjs` (both MIT). See [LICENSE](LICENSE) for the project's own code.

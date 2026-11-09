# How the kampung house file is made

`kampung-stilt-house.glb` is rebuilt by `npm run import -- <KL Rush checkout>` from the `source` block in `model.json`. Running it twice on the same commit gives the same bytes.

- **Source:** KL Rush at e041f0f3, `buildRumahKampung` in `src/world/landmarksHeritage.js`, called with no options (seed 1: brown walls and a zinc roof). The game builds the house in code; there is no Blender file.
- **Method:** `scripts/import-kl-rush.mjs` bundles the builder with the checkout's own Vite and three.js r186 in a temp folder and runs it in headless Chromium. The game's Lambert node materials become plain glTF materials (roughness 1, metalness 0) without their night glow, and three.js `GLTFExporter` saves the house. glTF-Transform then strips extras, prunes unused data and compresses the geometry with meshopt. The checkout is only read.
- **Result:**
  - 1,309 triangles in 4 materials, 9.6 × 8.5 × 11.1 m, origin at ground level.
  - Textures are the game's small painted canvases, as PNG: the walls at 128 × 186, the roof at 64 × 64.
  - 32,520 bytes (SHA-256 `7b6de81265f5781f2b9ff7b7a3ef17a5d0bfe4824615eef564917854c00fb032`). Khronos validator: 0 errors, 0 warnings.

The earlier one-off export (SHA-256 `9052a4c5d23ba3eac75e8d1bd8f4f3dd236efad4f7297109e413e1b99fdba4da`) carried the wall's night glow as an emissive map; this one drops it.

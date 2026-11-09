# How the kampung house file was made

`kampung-stilt-house.glb` (SHA-256 `9052a4c5d23ba3eac75e8d1bd8f4f3dd236efad4f7297109e413e1b99fdba4da`) was exported on 2026-11-09 as a test:

- **Source:** KL Rush at e041f0f3, `buildRumahKampung` in `src/world/landmarksHeritage.js`. The game builds the house in code; there is no Blender file.
- **Method:** a throwaway preview page in a KL Rush worktree called the builder, then saved the result with three.js r186 `GLTFExporter` (binary). The page was deleted afterwards, and KL Rush was left unchanged.
- **Result:**
  - 1,309 triangles in 4 materials, 9.56 × 8.54 × 11.11 m, origin at ground level.
  - The game's Lambert materials come out as plain glTF materials.
  - The wall material carries the game's night glow as an emissive map.
  - Textures are the game's small painted canvases: two at 128 × 186, one at 64 × 64.
  - Khronos validator: 0 errors, 0 warnings.

Not reproducible from this repo yet. A proper export should re-run the builder through a script kept here, drop the baked glow, and give the walls and roof real texture maps.

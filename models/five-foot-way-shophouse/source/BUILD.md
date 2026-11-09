# How the shophouse files were made

Built 2026-11-09 by a scripted agent from KL Rush source. Nothing in KL Rush was changed.

| File | SHA-256 |
| --- | --- |
| `row-kit/five-foot-way-shophouse-module.glb` | `2f5439ccf3fce7f04cb1e1ec9de5e464f988d148878e75dc5f8b8ce620aee520` |
| `row-kit/five-foot-way-arcade-column.glb` | `c962ad38f3daac1c1e2db5f5d3e631cb75d064cb9f38685d2dd3cec943aa2567` |
| `five-foot-way-shophouse.glb` | `e487a3b3ff427eccb7994c4b2c14776ec0f5538636fd189fc6112378d3b4615f` |

## Source

- KL Rush at e041f0f3: `content-src/buildings/shophouse.blend` (SHA-256 `33c36d7363c6b08868eff97a9b1624b6f67bf82257429a4cda0d271034d4997a`) with the fitting in `content-src/buildings/shophouse.json`.
- The maps are ambientCG PaintedPlaster017 and Concrete034, both CC0 1.0.

## Steps

Run these from this folder. Steps 2 and 4 use this repo's `node_modules`.

1. Run KL Rush's own Blender step against a scratch folder, with KL Rush unchanged. This writes `shophouse-near-raw.glb`: fitted geometry, no columns, no compression, the original maps. Blender 5.2.3 LTS was used (KL Rush pins 5.2.2).

   ```sh
   cd <kl-rush checkout>
   Blender --background --disable-autoexec content-src/buildings/shophouse.blend --python-exit-code 1 \
     --python scripts/build-shophouse.py -- --config content-src/buildings/shophouse.json --out <scratch>
   ```

2. `node flush-party-wall.mjs <scratch>/shophouse-near-raw.glb ../row-kit/five-foot-way-shophouse-module.glb`
   - Moves the left party wall's front end from z 8.000 to z 7.925, 1 cm behind the upper front panels at 7.935.
   - Without it, every join in a row shows a 0.25 m strip standing 6.5 cm proud.
   - It must move exactly 12 vertices, or it fails.

3. `Blender --background --factory-startup --python column.py -- ../row-kit/five-foot-way-arcade-column.glb`
   - Builds the game's arcade column: 0.5 × 4.2 × 0.5 m, `#f5f1e6`, roughness 0.9, origin at its base.

4. `node single.mjs ../row-kit/five-foot-way-shophouse-module.glb ../row-kit/five-foot-way-arcade-column.glb ../five-foot-way-shophouse.glb`
   - Adds two end columns at x = ±2.55, z = 7.7.
   - Textures pass through byte for byte.

## Open

- KL Rush's own `shophouse-near.glb` and `-far.glb` still have the 6.5 cm strip. The fix belongs in its `scripts/build-shophouse.py`.
- Origin: the game's mid-lot origin is kept (front line at z = +8). Moving z = 0 to the front line is undecided.
- Size: the normal maps are 1.9 MB of the 3.8 MB. A smaller viewer copy is not made yet.

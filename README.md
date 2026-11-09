# Malaysia 3D Library

Original 3D models inspired by everyday Malaysia, starting with buildings from the browser game KL Rush.

Status: private review. Nothing goes public until the release gate below passes.

## Commands

| Command | What it does |
| --- | --- |
| `npm run build` | Checks every model and writes the site to `dist/`. Fails on any gate. |
| `npm run import -- <kl-rush checkout>` | Writes the viewer file of every model with a `source` from a KL Rush checkout (see below). |
| `npm run posters` | Renders `models/<slug>/poster.webp` from each model's viewer camera (Chromium), only for models without one; `-- --all` redoes them all. Commit the result. |
| `npm run check` | Serves `dist/` and checks every page in Chromium and WebKit, desktop and phone. |
| `npm run seam -- <file.glb> --width=5.6` | Tiles a modular piece along X and checks the joins. |

## Adding a model

1. **Provenance first.** Record where the geometry and every texture came from, and under what licence. Anything you can't verify gets `"verified": false`. It can be previewed, but it can't go public.
2. **Export.** glTF 2.0 binary in metres: +Y up, street or front side facing +Z, origin on the ground. Embed the textures.
   - **Downloads and tile pieces** use no compression extensions (Draco, meshopt, KTX2), so they open anywhere.
   - **Viewer files** may use meshopt and KTX2 the way KL Rush ships them, since their decoders are bundled with the site. Draco is refused everywhere.
3. **Folder.** Create `models/<slug>/` containing:
   - `model.json` (fields below)
   - the GLB files
   - any kit folder to be zipped
   - `source/`, which records how the files were made
4. **Build.** `npm run build` checks each model:
   - Every GLB passes the Khronos validator with 0 errors.
   - Compression extensions are refused where step 2 says.
   - Modular pieces pass the tile check.
   - Triangle counts, file sizes and dimensions come from the files, never typed by hand.
   - Each kit folder is zipped.
5. **Look.** `npm run posters`, then `npm run check`.
6. **Owner review.** Set `"status": "approved"` and `"licence"` only after the owner signs off.

## `model.json`

| Field | Meaning |
| --- | --- |
| `id` | Catalogue number, `MY-001` onwards. The slug is the folder name. |
| `name`, `localName` | English name. Optional: the local name and its language tag. |
| `category`, `tags`, `summary`, `notes` | Page text. |
| `status` | `review` or `approved`. |
| `licence` | SPDX id or licence name for the whole download. `null` = pending. |
| `viewer` | GLB shown in the viewer, plus the `<model-viewer>` `camera-orbit` used for the default view and the poster. |
| `downloads` | Files offered for download. `from` names a folder zipped into `file` at build time. An empty list makes the model view-only. |
| `source` | Optional. Where `npm run import` takes the viewer file from: `repo` (`kl-rush`), the `commit` the checkout must be at, and either `file` (a path under KL Rush's `public/content/`) or `car` (a type under `public/content/vehicles/`, assembled from its body, wheels and `rig.json`, with `paint` as a `#rrggbb` body colour from the game's showroom palette; the game's code-built car materials become glTF materials over its shared surface textures). |
| `tile` | Optional. Modular piece and its repeat width for the tile check. |
| `credits` | One entry per source: what it covers, who made it, link, licence, whether that was verified, and a note. |

## Going public

`site.json` has `"public": false`. While it is false, every page carries `noindex` and `robots.txt` disallows everything.

Setting it to `true` makes the build refuse to run unless every model meets all four conditions:
- it is approved
- it has a licence
- every credit is verified
- it has a poster

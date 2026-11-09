# Five-Foot-Way Shophouse: row kit

From the Malaysia 3D Library (MY-001). The geometry is original.

## Files

| File | What it is | Triangles |
| --- | --- | ---: |
| `five-foot-way-shophouse-module.glb` | One 5.6 m shophouse unit with no arcade columns, for building rows | 5,000 |
| `five-foot-way-arcade-column.glb` | One arcade column, 0.5 × 4.2 × 0.5 m, origin at its base | 12 |

Both files are glTF 2.0 binary with no compression extensions. The module embeds six texture maps at 1024 × 512: colour and normal as JPEG, roughness as PNG.

## Units and axes

- Metres. +Y is up and the street side faces +Z.
- The module's origin is on the ground, centred across the frontage and halfway along the lot.
- The front building line is at z = +8, the awning reaches z = +9.23, and the rear wall is at z = −8.
- The module is 5.6 m wide (x from −2.8 to +2.8) and 9.3 m high.

## Building a row

1. Place modules side by side every 5.6 m: x = 0, 5.6, 11.2, … They meet without gaps or overlaps.
2. Place one column on every shared edge between two modules: x = 2.8, 8.4, …, at z = 7.7, y = 0. A column straddles the join, so don't put one column per module.
3. Place one column at each end of the row, 0.25 m in from the outer edge. For a row that starts at x = −2.8, the first end column is at x = −2.55.

A single standalone shophouse is the module with columns at x = −2.55 and x = +2.55. The library's `five-foot-way-shophouse.glb` is exactly that.

## Credits

- **Geometry:** Malaysia 3D Library.
- **Surface maps:** ambientCG, PaintedPlaster017 and Concrete034, CC0 1.0 (https://ambientcg.com).

## Reuse terms

Pending. Until a licence is published here, treat these files as a review copy, not for redistribution.

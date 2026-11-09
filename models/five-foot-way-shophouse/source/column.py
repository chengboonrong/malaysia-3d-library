# Blender --background --factory-startup --python column.py -- <out.glb>
# The game's arcade column (src/world/shophouseVisuals.js): 0.5 x 4.2 x 0.5 m, #f5f1e6, roughness 0.9, origin at the base.
import sys
import bpy
from mathutils import Color, Matrix
out = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.mesh.primitive_cube_add(size=1)
column = bpy.context.object
column.name = column.data.name = 'Arcade_column'
column.data.transform(Matrix.Diagonal((0.5, 0.5, 4.2, 1)) @ Matrix.Translation((0, 0, 0.5)))
material = bpy.data.materials.new('Arcade_column')
bsdf = material.node_tree.nodes['Principled BSDF']
srgb = Color((0xf5 / 255, 0xf1 / 255, 0xe6 / 255)).from_srgb_to_scene_linear()
bsdf.inputs['Base Color'].default_value = (*srgb, 1)
bsdf.inputs['Roughness'].default_value = 0.9
column.data.materials.append(material)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_yup=True, export_animations=False, export_cameras=False, export_lights=False, export_extras=False)

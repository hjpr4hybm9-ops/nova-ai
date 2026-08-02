import bpy, bmesh, math, os

# ============================================================
# RESET SCENE
# ============================================================
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for block in bpy.data.meshes:
    if block.users == 0:
        bpy.data.meshes.remove(block)
for block in bpy.data.materials:
    if block.users == 0:
        bpy.data.materials.remove(block)

scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'

# ============================================================
# HELPERS
# ============================================================

def make_mat(name, color, metallic=0.0, roughness=0.5, alpha=1.0, emission=None, emission_strength=0.0):
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if alpha < 1.0:
        bsdf.inputs["Alpha"].default_value = alpha
        m.blend_method = 'BLEND'
        m.show_transparent_back = False
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    return m

def shade_smooth_auto(obj, angle_deg=40):
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.shade_smooth()
    try:
        obj.data.use_auto_smooth = True
        obj.data.auto_smooth_angle = math.radians(angle_deg)
    except Exception:
        pass

def add_bevel(obj, width=0.012, segments=2):
    mod = obj.modifiers.new(name="Bevel", type='BEVEL')
    mod.width = width
    mod.segments = segments
    mod.limit_method = 'ANGLE'
    mod.angle_limit = math.radians(35)

def add_box(name, loc, size, mat, bevel=True, bevel_w=0.008):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = (size[0]/2, size[1]/2, size[2]/2)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        add_bevel(o, width=bevel_w, segments=2)
    o.data.materials.append(mat)
    shade_smooth_auto(o)
    return o

def add_cylinder(name, loc, radius, depth, mat, rot=(math.pi/2, 0, 0), verts=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.data.materials.append(mat)
    shade_smooth_auto(o)
    return o

# ============================================================
# MATERIALS
# ============================================================

mat_paint  = make_mat("GTI_Red", (0.62, 0.02, 0.04), metallic=0.25, roughness=0.28)
mat_black  = make_mat("Black_Plastic", (0.015, 0.015, 0.017), roughness=0.5)
mat_trim   = make_mat("Dark_Trim", (0.05, 0.05, 0.06), roughness=0.55)
mat_glass  = make_mat("Glass", (0.35, 0.45, 0.5), roughness=0.05, alpha=0.55)
mat_tyre   = make_mat("Tyre", (0.02, 0.02, 0.02), roughness=0.85)
mat_wheel  = make_mat("Wheel", (0.82, 0.84, 0.87), metallic=0.75, roughness=0.25)
mat_hub    = make_mat("Hub", (0.05, 0.05, 0.06), roughness=0.5)
mat_head   = make_mat("Headlamp", (0.95, 0.92, 0.75), roughness=0.15, emission=(1.0, 0.92, 0.6), emission_strength=0.6)
mat_ind    = make_mat("Indicator", (1.0, 0.6, 0.1), roughness=0.3, emission=(1.0, 0.55, 0.05), emission_strength=0.7)
mat_tailU  = make_mat("TailUpper", (0.92, 0.9, 0.85), roughness=0.3)
mat_tail   = make_mat("TailLamp", (0.85, 0.05, 0.05), roughness=0.2, emission=(0.9, 0.05, 0.05), emission_strength=0.6)
mat_plate  = make_mat("Plate", (0.93, 0.93, 0.93), roughness=0.5)

# ============================================================
# DIMENSIONS (meters, roughly Peugeot 106 GTI)
# ============================================================

WHEELBASE = 2.385
TRACK = 1.40
WHEEL_R = 0.28
WHEEL_W = 0.30
FRONT_AXLE_X = WHEELBASE / 2
REAR_AXLE_X = -WHEELBASE / 2

# Body cross-sections (ring loft): x, half_width, z_bottom, z_top
RINGS = [
    (-1.84, 0.62, 0.26, 0.56),   # rear bumper tip
    (-1.60, 0.78, 0.18, 0.72),   # rear valance / tailgate bottom
    (-1.20, 0.795, 0.16, 1.22),  # C-pillar / tailgate top
    (-0.75, 0.795, 0.16, 1.34),  # roof rear
    ( 0.30, 0.795, 0.16, 1.34),  # roof front
    ( 0.72, 0.795, 0.16, 0.86),  # cowl / windshield base
    ( 1.28, 0.74, 0.20, 0.72),   # hood
    ( 1.62, 0.66, 0.24, 0.62),   # front fender
    ( 1.84, 0.58, 0.26, 0.52),   # front bumper tip
]

# ============================================================
# BODY (ring loft via bmesh)
# ============================================================

def build_body():
    bm = bmesh.new()
    ring_verts = []
    for (x, hw, z0, z1) in RINGS:
        v0 = bm.verts.new((x, -hw, z0))
        v1 = bm.verts.new((x, hw, z0))
        v2 = bm.verts.new((x, hw, z1))
        v3 = bm.verts.new((x, -hw, z1))
        ring_verts.append([v0, v1, v2, v3])
    n = len(ring_verts)
    for i in range(n - 1):
        a, b = ring_verts[i], ring_verts[i + 1]
        bm.faces.new([a[0], b[0], b[1], a[1]])  # bottom
        bm.faces.new([a[1], b[1], b[2], a[2]])  # +y side
        bm.faces.new([a[2], b[2], b[3], a[3]])  # top
        bm.faces.new([a[3], b[3], b[0], a[0]])  # -y side
    bm.faces.new(list(reversed(ring_verts[0])))
    bm.faces.new(ring_verts[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

    mesh = bpy.data.meshes.new("BodyMesh")
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new("Body", mesh)
    bpy.context.collection.objects.link(obj)
    add_bevel(obj, width=0.02, segments=2)
    obj.data.materials.append(mat_paint)
    shade_smooth_auto(obj, angle_deg=42)
    return obj

body = build_body()

# ============================================================
# WINDOWS (flush glass panels between ring transitions)
# ============================================================

def ring_by_x(x):
    for r in RINGS:
        if abs(r[0] - x) < 1e-6:
            return r
    raise ValueError(x)

def glass_panel_diagonal(name, x_a, x_b, z_a, z_b, width):
    """Single panel spanning the full car width (Y), diagonal in the XZ plane
    from (x_a,z_a) to (x_b,z_b)."""
    mx, mz = (x_a + x_b) / 2, (z_a + z_b) / 2
    length = math.hypot(x_b - x_a, z_b - z_a)
    angle = math.atan2(z_b - z_a, x_b - x_a)
    bpy.ops.mesh.primitive_plane_add(location=(mx, 0, mz))
    p = bpy.context.object
    p.name = name
    p.scale = (length / 2, width / 2, 1)
    p.rotation_euler = (0, angle, 0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    p.data.materials.append(mat_glass)
    return p

# windshield: roof-front -> cowl
r_roofF, r_cowl = ring_by_x(0.30), ring_by_x(0.72)
glass_panel_diagonal("Windshield", r_roofF[0], r_cowl[0], r_roofF[3], r_cowl[3], 0.795 * 2 - 0.14)

# rear glass: roof-rear -> C-pillar
r_roofR, r_cpil = ring_by_x(-0.75), ring_by_x(-1.20)
glass_panel_diagonal("RearGlass", r_roofR[0], r_cpil[0], r_roofR[3], r_cpil[3], 0.795 * 2 - 0.14)

# door glass (flat vertical) between cowl and mid-cabin
bpy.ops.mesh.primitive_plane_add(location=(0.05, 0.795 - 0.02, 0.98))
door_glass_r = bpy.context.object
door_glass_r.name = "DoorGlass_R"
door_glass_r.scale = (0.62, 0.36, 1)
door_glass_r.rotation_euler = (math.pi / 2, 0, 0)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
door_glass_r.data.materials.append(mat_glass)
door_glass_l = door_glass_r.copy()
door_glass_l.data = door_glass_r.data.copy()
door_glass_l.name = "DoorGlass_L"
door_glass_l.location.y = -(0.795 - 0.02)
bpy.context.collection.objects.link(door_glass_l)

# rear quarter glass
bpy.ops.mesh.primitive_plane_add(location=(-0.95, 0.795 - 0.02, 0.95))
qg_r = bpy.context.object
qg_r.name = "QuarterGlass_R"
qg_r.scale = (0.35, 0.30, 1)
qg_r.rotation_euler = (math.pi / 2, 0, 0)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
qg_r.data.materials.append(mat_glass)
qg_l = qg_r.copy()
qg_l.data = qg_r.data.copy()
qg_l.name = "QuarterGlass_L"
qg_l.location.y = -(0.795 - 0.02)
bpy.context.collection.objects.link(qg_l)

# ============================================================
# ROOF TRIM / BUMPER VALANCES / SKIRTS
# ============================================================

add_box("RoofTrim", (-0.22, 0, 1.335), (1.10, 1.58, 0.03), mat_trim)

add_box("FrontValance", (1.75, 0, 0.28), (0.28, 1.46, 0.24), mat_black)
add_box("FrontLip", (1.86, 0, 0.16), (0.20, 1.46, 0.10), mat_trim)
add_box("RearValance", (-1.70, 0, 0.32), (0.30, 1.42, 0.32), mat_black)

add_box("SkirtR", (0, 0.80, 0.17), (2.6, 0.05, 0.14), mat_trim)
add_box("SkirtL", (0, -0.80, 0.17), (2.6, 0.05, 0.14), mat_trim)

# grille + fog lights
add_box("Grille", (1.87, 0, 0.55), (0.10, 0.58, 0.28), mat_trim)
for side in (1, -1):
    add_cylinder(f"Fog_{'R' if side>0 else 'L'}", (1.90, side * 0.46, 0.28), 0.07, 0.06, mat_head, rot=(0, math.pi/2, 0), verts=16)

# headlights (rounded lens units, closer to the reference photos)
for side in (1, -1):
    bpy.ops.mesh.primitive_uv_sphere_add(location=(1.68, side * 0.44, 0.58), segments=20, ring_count=12)
    h = bpy.context.object
    h.name = f"Headlamp_{'R' if side>0 else 'L'}"
    h.scale = (0.11, 0.17, 0.115)
    h.rotation_euler = (0, 0, -0.22 * side)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    h.data.materials.append(mat_head)
    shade_smooth_auto(h)
    bpy.ops.mesh.primitive_uv_sphere_add(location=(1.66, side * 0.57, 0.52), segments=16, ring_count=10)
    ind = bpy.context.object
    ind.name = f"Indicator_{'R' if side>0 else 'L'}"
    ind.scale = (0.07, 0.055, 0.06)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ind.data.materials.append(mat_ind)
    shade_smooth_auto(ind)

# taillights (two-tone, wrap corner)
for side in (1, -1):
    bpy.ops.mesh.primitive_cube_add(location=(-1.68, side * 0.62, 0.68))
    tu = bpy.context.object
    tu.name = f"TailUpper_{'R' if side>0 else 'L'}"
    tu.scale = (0.08, 0.14, 0.06)
    tu.rotation_euler = (0, 0, 0.22 * side)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    tu.data.materials.append(mat_tailU)
    shade_smooth_auto(tu)
    bpy.ops.mesh.primitive_cube_add(location=(-1.68, side * 0.62, 0.56))
    tl = bpy.context.object
    tl.name = f"Tail_{'R' if side>0 else 'L'}"
    tl.scale = (0.08, 0.14, 0.10)
    tl.rotation_euler = (0, 0, 0.22 * side)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    tl.data.materials.append(mat_tail)
    shade_smooth_auto(tl)

# third brake light + spoiler
add_box("SpoilerBase", (-1.15, 0, 1.30), (0.10, 1.30, 0.05), mat_trim)
add_box("SpoilerWing", (-1.20, 0, 1.36), (0.16, 1.36, 0.035), mat_black)
add_box("BrakeLight", (-1.28, 0, 1.36), (0.02, 0.70, 0.02), mat_tail)

# license plate
add_box("Plate", (-1.86, 0, 0.30), (0.02, 0.32, 0.10), mat_plate)

# door handles + seam
for side in (1, -1):
    add_box(f"Handle_{'R' if side>0 else 'L'}", (-0.15, side * (0.795 - 0.01), 0.90), (0.16, 0.02, 0.035), mat_trim, bevel=False)
add_box("DoorSeamR", (-0.35, 0.795 - 0.005, 0.72), (0.01, 0.01, 1.28), mat_trim, bevel=False)
add_box("DoorSeamL", (-0.35, -(0.795 - 0.005), 0.72), (0.01, 0.01, 1.28), mat_trim, bevel=False)

# mirrors
for side in (1, -1):
    bpy.ops.mesh.primitive_cube_add(location=(0.62, side * 0.87, 0.98))
    m = bpy.context.object
    m.name = f"Mirror_{'R' if side>0 else 'L'}"
    m.scale = (0.10, 0.05, 0.05)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    add_bevel(m, width=0.01, segments=3)
    m.data.materials.append(mat_trim)
    shade_smooth_auto(m)

# wheel arch flares: body-colour partial ring (C-shape, open at the bottom)
# swept by hand via bmesh since Blender's torus primitive has no arc parameter.
def build_arch_flare(name, x, cy, cz, major_r, tube_r, arc_deg=200, start_deg=-100, maj_segs=18, min_segs=8):
    bm = bmesh.new()
    ring_loops = []
    for i in range(maj_segs + 1):
        t = math.radians(start_deg + arc_deg * i / maj_segs)
        rad_y, rad_z = math.sin(t), math.cos(t)
        ry, rz = cy + major_r * rad_y, cz + major_r * rad_z
        loop = []
        for j in range(min_segs):
            u = 2 * math.pi * j / min_segs
            ox = tube_r * math.cos(u)
            oy = tube_r * math.sin(u) * rad_y
            oz = tube_r * math.sin(u) * rad_z
            loop.append(bm.verts.new((x + ox, ry + oy, rz + oz)))
        ring_loops.append(loop)
    for i in range(len(ring_loops) - 1):
        a, b = ring_loops[i], ring_loops[i + 1]
        for j in range(min_segs):
            j2 = (j + 1) % min_segs
            bm.faces.new([a[j], b[j], b[j2], a[j2]])
    bm.faces.new(ring_loops[0])
    bm.faces.new(list(reversed(ring_loops[-1])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat_paint)
    shade_smooth_auto(obj)
    return obj

for (ax, side) in [(FRONT_AXLE_X, 1), (FRONT_AXLE_X, -1), (REAR_AXLE_X, 1), (REAR_AXLE_X, -1)]:
    build_arch_flare(
        f"ArchFlare_{ax:.2f}_{'R' if side>0 else 'L'}",
        x=ax, cy=side * (TRACK / 2), cz=WHEEL_R,
        major_r=WHEEL_R + 0.06, tube_r=0.035,
    )

# ============================================================
# WHEELS
# ============================================================

def create_wheel(name, loc):
    parts = []
    tyre = add_cylinder(name + "_Tyre", loc, WHEEL_R, WHEEL_W, mat_tyre, rot=(math.pi/2, 0, 0), verts=28)
    parts.append(tyre)
    rim = add_cylinder(name + "_Rim", loc, WHEEL_R * 0.62, WHEEL_W * 0.92, mat_wheel, rot=(math.pi/2, 0, 0), verts=24)
    parts.append(rim)
    hub = add_cylinder(name + "_Hub", loc, WHEEL_R * 0.14, WHEEL_W * 0.96, mat_hub, rot=(math.pi/2, 0, 0), verts=12)
    parts.append(hub)
    for i in range(7):
        ang = math.radians(i * (360 / 7))
        bpy.ops.mesh.primitive_cube_add(location=loc)
        sp = bpy.context.object
        sp.name = f"{name}_Spoke_{i}"
        sp.scale = (0.012, WHEEL_R * 0.55, WHEEL_W * 0.42)
        sp.rotation_euler = (ang, 0, 0)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        sp.data.materials.append(mat_wheel)
        shade_smooth_auto(sp)
        parts.append(sp)
    return parts

wheel_z = WHEEL_R
for (ax, side, tag) in [
    (FRONT_AXLE_X, 1, "FR"), (FRONT_AXLE_X, -1, "FL"),
    (REAR_AXLE_X, 1, "RR"), (REAR_AXLE_X, -1, "RL"),
]:
    create_wheel(f"Wheel_{tag}", (ax, side * (TRACK / 2), wheel_z))

# ============================================================
# GROUND SHADOW
# ============================================================

bpy.ops.mesh.primitive_circle_add(radius=1.0, fill_type='NGON', location=(0, 0, 0.01))
shadow = bpy.context.object
shadow.name = "Shadow"
shadow_mat = make_mat("ShadowMat", (0, 0, 0), roughness=1.0, alpha=0.25)
shadow.data.materials.append(shadow_mat)

# ============================================================
# PARENT EVERYTHING
# ============================================================

bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
car_root = bpy.context.object
car_root.name = "Peugeot106GTI"
for obj in bpy.data.objects:
    if obj.name != car_root.name and obj.parent is None:
        obj.parent = car_root

# ============================================================
# EXPORT GLB
# ============================================================

script_path = bpy.data.filepath
out_dir = os.path.dirname(script_path) if script_path else os.getcwd()
out_path = os.path.join(out_dir, "peugeot-106-gti.glb")

for obj in bpy.data.objects:
    obj.select_set(False)
car_root.select_set(True)
for child in car_root.children_recursive:
    child.select_set(True)
bpy.context.view_layer.objects.active = car_root

bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format='GLB',
    use_selection=True,
    export_apply=True,
)

print("DONE:", out_path)

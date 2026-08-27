import pyluxcore as luxcore


def build_scene(scene_data: dict) -> luxcore.Scene:
    scene = luxcore.Scene()

    _add_textures(scene, scene_data.get("textures", {}))
    _add_materials(scene, scene_data.get("materials", {}))
    _add_geometry(scene, scene_data.get("objects", []), scene_data.get("materials", {}))
    _add_lights(scene, scene_data.get("lights", []))
    _add_camera(scene, scene_data.get("camera", {}))

    return scene


def _add_textures(scene: luxcore.Scene, textures: dict):
    for name, tex in textures.items():
        tex_type = tex.get("type", "imagemap")
        props = {"type": tex_type}
        if tex_type == "imagemap":
            props["file"] = tex["file"]
        if "gamma" in tex:
            props["gamma"] = tex["gamma"]
        scene.AddTexture(name, props)


def _add_materials(scene: luxcore.Scene, materials: dict):
    for name, mat in materials.items():
        mat_type = mat.get("type", "matte")
        props = {"type": mat_type}
        if mat_type == "matte":
            kd = mat.get("kd", [0.5, 0.5, 0.5])
            if isinstance(kd, str):
                props["kd"] = {"type": "imagemap", "file": kd}
            else:
                props["kd"] = kd
        elif mat_type == "glossy":
            kd = mat.get("kd", [0.5, 0.5, 0.5])
            if isinstance(kd, str):
                props["kd"] = {"type": "imagemap", "file": kd}
            else:
                props["kd"] = kd
            props["uroughness"] = mat.get("shininess", 0.1)
            props["vroughness"] = mat.get("shininess", 0.1)
        scene.AddMaterial(name, props)


def _add_geometry(scene: luxcore.Scene, objects: list, materials: dict):
    for obj in objects:
        obj_type = obj.get("type", "mesh")
        obj_name = obj.get("name", "unnamed")
        mat_name = obj.get("material", "")
        props = {}
        if mat_name:
            props["material"] = mat_name

        if obj_type == "box":
            verts, tris = _box_to_mesh(obj.get("size", [1, 1, 1]))
        elif obj_type == "polygon":
            verts, tris = _polygon_to_mesh(obj.get("vertices", []), obj.get("z", 0), obj.get("height", 2.4))
        else:
            verts = obj.get("vertices", [])
            tris = obj.get("triangles", [])

        if verts and tris:
            props["vertices"] = verts
            props["triangles"] = tris
            scene.AddMesh(obj_name, props)


def _box_to_mesh(size: list):
    x, y, z = size[0] / 2, size[1] / 2, size[2] / 2
    verts = [
        -x, -y, 0,  x, -y, 0,  x, y, 0,  -x, y, 0,
        -x, -y, z,  x, -y, z,  x, y, z,  -x, y, z,
    ]
    tris = [
        0, 1, 2,  0, 2, 3,
        4, 6, 5,  4, 7, 6,
        0, 4, 5,  0, 5, 1,
        2, 6, 7,  2, 7, 3,
        0, 3, 7,  0, 7, 4,
        1, 5, 6,  1, 6, 2,
    ]
    return verts, tris


def _polygon_to_mesh(vertices: list, z: float, height: float):
    verts = []
    tris = []
    n = len(vertices)
    if n < 3:
        return verts, tris

    for v in vertices:
        verts.extend([v[0], v[1], z])
    for v in vertices:
        verts.extend([v[0], v[1], z + height])

    for i in range(n):
        a = i
        b = (i + 1) % n
        c = b + n
        d = a + n
        tris.extend([a, b, c])
        tris.extend([a, c, d])

    return verts, tris


def _add_lights(scene: luxcore.Scene, lights: list):
    for light in lights:
        light_type = light.get("type", "point")
        name = light.get("name", "light")

        if light_type == "directional":
            direction = light.get("direction", [0, 0, -1])
            gain = light.get("gain", [1, 1, 1])
            turbidity = light.get("turbidity", 2.0)
            scene.AddLight(name, {
                "type": "sun",
                "direction": direction,
                "gain": gain,
                "turbidity": turbidity,
            })
        elif light_type == "point":
            position = light.get("position", [0, 0, 5])
            gain = light.get("gain", [5000, 5000, 5000])
            scene.AddLight(name, {
                "type": "point",
                "position": position,
                "gain": gain,
            })


def _add_camera(scene: luxcore.Scene, camera: dict):
    lookat = camera.get("lookat", [[0, 0, 5], [0, 0, 0], [0, 0, 1]])
    fov = camera.get("fov", 60.0)
    scene.AddCamera("camera", {
        "type": "perspective",
        "lookat": lookat,
        "fieldofview": fov,
    })
    scene.SetCamera("camera")

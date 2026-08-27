#!/usr/bin/env python3
import base64
import json
import sys

try:
    import pyluxcore as luxcore
except ImportError:
    print("pyluxcore not installed. Run: pip install pyluxcore", file=sys.stderr)
    sys.exit(1)

from bridge import build_scene


def configure_render() -> luxcore.Properties:
    config = luxcore.Properties()
    config.Set("renderengine.type", "PATHCPU")
    config.Set("sampler.type", "SOBOL")
    config.Set("film.width", 800)
    config.Set("film.height", 600)
    config.Set("film.samplesperpixel", 256)
    config.Set("film.gamma", 2.2)
    return config


def render(scene_data: dict) -> bytes:
    scene = build_scene(scene_data)
    config = configure_render()
    luxcore.Parse(config)
    scene.Parse(luxcore.GetRenderConfig())

    scene.Wait()
    film = scene.GetFilm()
    film.Save("render_output")

    with open("render_output.png", "rb") as f:
        return f.read()


def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            scene_data = json.loads(line)
            png_bytes = render(scene_data)
            b64 = base64.b64encode(png_bytes).decode("ascii")
            print(b64)
            sys.stdout.flush()
        except Exception as e:
            print(json.dumps({"error": str(e)}), file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()

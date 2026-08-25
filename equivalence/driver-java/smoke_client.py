#!/usr/bin/env python3
"""A1+A2+A3 smoke test for sh3d-driver.

Connects to a running DriverMain, expects hello, round-trips ping /
new_home / get_capabilities plus one UNKNOWN_COMMAND probe (A1), then
scripts a 4-wall room through the interaction commands and asserts the
wall graph, undo/redo, magnetism flag and clipboard paste (A2), and
validates every get_state payload against the frozen
docs/schema/home-project.schema.json (A3). Exit code 0 = all passed.
"""
import json
import os
import socket
import sys
from pathlib import Path

import jsonschema

SCHEMA_PATH = Path(__file__).resolve().parents[2] / "docs" / "schema" / "home-project.schema.json"


def validate_state(data: dict) -> str | None:
    try:
        jsonschema.validate(data, json.loads(SCHEMA_PATH.read_text()))
        return None
    except jsonschema.ValidationError as e:
        return f"{list(e.absolute_path)}: {e.message}"


def main() -> int:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 9440
    failures: list[str] = []

    def expect(cond: bool, label: str) -> None:
        print(("PASS" if cond else "FAIL"), label)
        if not cond:
            failures.append(label)

    sock = socket.create_connection(("127.0.0.1", port), timeout=60)
    reader = sock.makefile("r", encoding="utf-8", newline="\n")

    hello = json.loads(reader.readline())
    expect(hello.get("type") == "hello", f'hello.type == "hello" ({hello})')
    expect(hello.get("app") == "sh3d-driver", f'hello.app == "sh3d-driver" ({hello})')
    expect(isinstance(hello.get("version"), str), f"hello.version is string ({hello})")
    expect("mode" in hello, f"hello has mode ({hello})")

    next_id = 0

    def rpc(t: str, **params) -> dict:
        nonlocal next_id
        next_id += 1
        req_id = next_id
        line = json.dumps({"id": req_id, "type": t, "params": params})
        sock.sendall(line.encode("utf-8") + b"\n")
        return json.loads(reader.readline())

    def ok(r: dict) -> bool:
        return r.get("ok") is True

    state_count = 0

    def get_state() -> dict:
        nonlocal state_count
        state_count += 1
        r = rpc("get_state")
        if not ok(r):
            expect(False, f"get_state #{state_count} ok ({r})")
            return {}
        err = validate_state(r["data"])
        expect(err is None, f"get_state #{state_count} validates against schema ({err})")
        return r["data"]

    r_ping = rpc("ping")
    expect(r_ping == {"id": 1, "ok": True, "data": {"pong": True}}, f"ping round-trip ({r_ping})")

    r_new = rpc("new_home")
    expect(r_new == {"id": 2, "ok": True, "data": {}}, f"new_home round-trip ({r_new})")

    r_caps = rpc("get_capabilities")
    cmds = set(r_caps.get("data", {}).get("commands", []))
    a2_cmds = {
        "select_tool", "press_mouse", "move_mouse", "release_mouse",
        "click", "double_click", "key", "set_magnetism", "undo", "redo",
        "delete_selection", "select_all", "clear_selection",
        "copy_selection", "cut_selection", "paste", "get_state",
    }
    expect(r_caps.get("ok") is True and {"ping", "new_home", "get_capabilities"} <= cmds,
           f"capabilities lists A1 commands ({len(cmds)} cmds)")
    expect(a2_cmds <= cmds, f"capabilities lists A2 commands ({a2_cmds - cmds} missing)")
    a4_cmds = {"capture_plan", "capture_3d", "save_home", "open_home"}
    expect(a4_cmds <= cmds, f"capabilities lists A4 commands ({a4_cmds - cmds} missing)")

    r_bad = rpc("definitely_not_a_command")
    expect(r_bad.get("ok") is False and r_bad.get("code") == "UNKNOWN_COMMAND",
           f"unknown command -> ok:false UNKNOWN_COMMAND ({r_bad})")

    r_echo = rpc("ping")
    expect(r_echo.get("id") == 5, f"id echo ({r_echo})")

    # ---- A2/A3: scripted 4-wall room + full state export ---------------
    s0 = get_state()
    expect(s0.get("schemaVersion") == 1, f"schemaVersion 1 ({s0.get('schemaVersion')})")
    level_ids = [lv["id"] for lv in s0.get("levels", [])]
    expect(isinstance(s0.get("levels"), list),
           f"levels exported (SH3D default home may have none: {level_ids})")
    cams = s0.get("cameras", {})
    top = cams.get("top", {})
    obs = cams.get("observer", {})
    expect(abs(top.get("z", 0) - 1010.0) < 1 and abs(top.get("fovDeg", 0) - 63.0) < 0.5,
           f"top camera defaults z=1010 fov=63 ({top})")
    expect(abs(obs.get("x", 0) - 50.0) < 1 and abs(obs.get("yawDeg", 0) - (-45.0)) < 0.5
           and abs(obs.get("pitchDeg", 0) - 11.25) < 0.5,
           f"observer camera defaults eye=170cm yaw=-45 pitch=11.25 ({obs})")
    expect(isinstance(s0.get("compass"), dict), "compass exported")
    expect(s0.get("activeTool") == "selection",
           f"activeTool selection ({s0.get('activeTool')})")
    caps0 = s0.get("capabilities", {})
    expect(caps0.get("canUndo") is False and caps0.get("canRedo") is False,
           f"fresh home cannot undo/redo ({caps0})")

    r_mag = rpc("set_magnetism", enabled=False)
    expect(ok(r_mag) and r_mag["data"]["enabled"] is False,
           f"set_magnetism off ({r_mag})")

    r_tool = rpc("select_tool", tool="wall_creation")
    expect(ok(r_tool), f"select_tool wall_creation ({r_tool})")
    s_tool = get_state()
    expect(s_tool.get("activeTool") == "wall",
           f"activeTool wall during creation ({s_tool.get('activeTool')})")

    # Chain around a 200x200 room; double-click closes + validates.
    corners = [(100, 100), (300, 100), (300, 300), (100, 300)]
    for x, y in [(100, 100), *corners[1:], (100, 100)]:
        rpc("move_mouse", x=x, y=y)
        r_click = rpc("click", x=x, y=y)
        if not ok(r_click):
            break
    r_close = rpc("double_click", x=100, y=100)
    expect(ok(r_close), f"loop close double-click ({r_close})")

    s_room = get_state()
    walls = s_room.get("walls", [])
    expect(len(walls) == 4,
           f"4 walls after scripted chain ({len(walls)} walls)")

    got = {(round(w["xStart"]), round(w["yStart"]),
            round(w["xEnd"]), round(w["yEnd"])) for w in walls}
    want = {(*corners[i], *corners[(i + 1) % 4]) for i in range(4)}
    expect(got == want, f"wall coords match clicked corners ({sorted(got)})")

    heights = {w["height"] for w in walls}
    expect(heights == {250.0}, f"default wall height 250cm ({heights})")

    ids_seen = [w["id"] for w in walls]
    expect(len(set(ids_seen)) == 4 and ids_seen[0].startswith("wall-"),
           f"driver-assigned wall ids ({ids_seen})")
    expect(all(w.get("levelRef") in (None, *level_ids) for w in walls),
           "wall levelRef null or known level")
    caps_room = s_room.get("capabilities", {})
    expect(caps_room.get("canUndo") is True, f"canUndo after createWalls ({caps_room})")

    # undo removes the created walls, redo brings them back
    r_undo = rpc("undo")
    s_after_undo = get_state()
    n_after_undo = len(s_after_undo.get("walls", []))
    expect(ok(r_undo) and n_after_undo == 0,
           f"undo removes walls ({n_after_undo} left)")

    r_redo = rpc("redo")
    s_after_redo = get_state()
    n_after_redo = len(s_after_redo.get("walls", []))
    expect(ok(r_redo) and n_after_redo == 4,
           f"redo restores walls ({n_after_redo})")

    # selection: select_all then clear_selection
    r_sel_all = rpc("select_all")
    s_sel = get_state()
    sel_ids = s_sel.get("selection", [])
    expect(ok(r_sel_all) and len(sel_ids) >= 4
           and all(i in set(ids_seen) or i.startswith("compass") for i in sel_ids),
           f"select_all selects walls ({sel_ids} selected)")
    sel_walls = [w for w in s_sel.get("walls", []) if w["id"] in sel_ids]
    expect(len(sel_walls) >= 4, f"selected ids resolve to walls ({len(sel_walls)})")

    r_clear = rpc("clear_selection")
    s_cleared = get_state()
    expect(ok(r_clear) and len(s_cleared.get("selection", [])) == 0,
           f"clear_selection empties selection ({s_cleared.get('selection')})")

    # clipboard: copy 4 walls, paste -> duplicates appear
    rpc("select_all")
    r_copy = rpc("copy_selection")
    r_paste = rpc("paste")
    s_pasted = get_state()
    n_pasted = len(s_pasted.get("walls", []))
    pasted_ids = {w["id"] for w in s_pasted.get("walls", [])}
    expect(ok(r_copy) and ok(r_paste) and n_pasted > 4 and len(pasted_ids) == n_pasted,
           f"copy+paste duplicates walls ({n_pasted} walls, unique ids)")

    # delete key with selection removes pasted duplicates again
    rpc("undo")  # drop paste
    rpc("select_all")
    r_del = rpc("key", key="delete")
    s_deleted = get_state()
    expect(ok(r_del) and len(s_deleted.get("walls", [])) == 0,
           f"key delete clears selected walls ({s_deleted.get('walls')})")

    # escape mid-chain commits nothing extra; new_home resets ids
    # (walls are currently deleted by the key-delete above -> expect 0)
    rpc("select_tool", tool="wall_creation")
    rpc("move_mouse", x=500, y=500)
    rpc("click", x=500, y=500)
    rpc("move_mouse", x=600, y=500)
    r_esc = rpc("key", key="escape")
    s_esc = get_state()
    esc_walls = len(s_esc.get("walls", []))
    expect(ok(r_esc) and esc_walls == 0,
           f"escape ends chain without stray wall ({esc_walls} walls)")

    r_new2 = rpc("new_home")
    s_fresh = get_state()
    fresh_walls = s_fresh.get("walls", [])
    caps_fresh = s_fresh.get("capabilities", {})
    expect(ok(r_new2) and fresh_walls == [], f"new_home resets state ({fresh_walls})")
    expect(caps_fresh.get("canUndo") is False and caps_fresh.get("canRedo") is False,
           f"new_home clears undo history flags ({caps_fresh})")

    # ---- A4: deterministic offscreen captures + .sh3d save/open ----------
    cap_dir = "/tmp/opencode/a4"
    os.makedirs(cap_dir, exist_ok=True)

    cap1 = rpc("capture_plan", width=640, height=480, path=f"{cap_dir}/plan-1.png")
    cap2 = rpc("capture_plan", width=640, height=480, path=f"{cap_dir}/plan-2.png")
    expect(ok(cap1) and ok(cap2), f"capture_plan round-trips ({cap1.get('error') or cap2.get('error')})")
    expect(cap1["data"]["sha256"] == cap2["data"]["sha256"],
           "two identical plan captures are byte-identical")

    cap3d1 = rpc("capture_3d", width=640, height=480, path=f"{cap_dir}/view3d-1.png")
    cap3d2 = rpc("capture_3d", width=640, height=480, path=f"{cap_dir}/view3d-2.png")
    expect(ok(cap3d1) and ok(cap3d2),
           f"capture_3d round-trips ({cap3d1.get('error') or cap3d2.get('error')})")
    expect(cap3d1["data"]["sha256"] == cap3d2["data"]["sha256"],
           "two identical 3D captures are byte-identical")

    # populate again for the save/open round-trip
    rpc("set_magnetism", enabled=False)
    rpc("select_tool", tool="wall_creation")
    for x, y in [(100, 100), (300, 100), (300, 300), (100, 300), (100, 100)]:
        rpc("move_mouse", x=x, y=y)
        rpc("click", x=x, y=y)
    rpc("double_click", x=100, y=100)
    s_before_save = get_state()
    before_walls = {(round(w["xStart"]), round(w["yStart"]),
                     round(w["xEnd"]), round(w["yEnd"])) for w in s_before_save["walls"]}
    expect(len(before_walls) == 4, f"room redrawn for save test ({len(before_walls)})")

    sh3d_path = f"{cap_dir}/a4-room.sh3d"
    r_save = rpc("save_home", path=sh3d_path)
    expect(ok(r_save) and r_save["data"]["walls"] == 4, f"save_home ({r_save})")

    rpc("new_home")
    expect(len(get_state().get("walls", [])) == 0, "home emptied before open_home")

    r_open = rpc("open_home", path=sh3d_path)
    s_open = get_state()
    after_walls = {(round(w["xStart"]), round(w["yStart"]),
                    round(w["xEnd"]), round(w["yEnd"])) for w in s_open.get("walls", [])}
    open_ids = sorted(w["id"] for w in s_open.get("walls", []))
    expect(ok(r_open) and r_open.get("data", {}).get("walls") == 4, f"open_home ({r_open})")
    expect(after_walls == before_walls, "open_home restores identical wall coords")
    expect(open_ids == ["wall-1", "wall-2", "wall-3", "wall-4"],
           f"ids re-assigned after open ({open_ids})")

    r_err = rpc("select_tool", tool="nonexistent_tool")
    expect(r_err.get("ok") is False and r_err.get("code") == "INTERNAL",
           f"bad tool -> INTERNAL error ({r_err})")

    sock.close()

    if failures:
        print(f"\n{len(failures)} assertion(s) failed")
        return 1
    print("\nsmoke OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""A1+A2 smoke test for sh3d-driver.

Connects to a running DriverMain, expects hello, round-trips ping /
new_home / get_capabilities plus one UNKNOWN_COMMAND probe (A1), then
scripts a 4-wall room through the interaction commands and asserts the
wall graph, undo/redo, magnetism flag and clipboard paste (A2).
Exit code 0 = all assertions passed.
"""
import json
import socket
import sys


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

    r_bad = rpc("definitely_not_a_command")
    expect(r_bad.get("ok") is False and r_bad.get("code") == "UNKNOWN_COMMAND",
           f"unknown command -> ok:false UNKNOWN_COMMAND ({r_bad})")

    r_echo = rpc("ping")
    expect(r_echo.get("id") == 5, f"id echo ({r_echo})")

    # ---- A2: scripted 4-wall room ------------------------------------
    r_state0 = rpc("get_state")
    expect(ok(r_state0) and r_state0["data"]["walls"] == [],
           f"empty home has no walls ({r_state0})")

    r_mag = rpc("set_magnetism", enabled=False)
    expect(ok(r_mag) and r_mag["data"]["enabled"] is False,
           f"set_magnetism off ({r_mag})")

    r_tool = rpc("select_tool", tool="wall_creation")
    expect(ok(r_tool), f"select_tool wall_creation ({r_tool})")

    # Chain around a 200x200 room; double-click closes + validates.
    corners = [(100, 100), (300, 100), (300, 300), (100, 300)]
    for x, y in [(100, 100), *corners[1:], (100, 100)]:
        rpc("move_mouse", x=x, y=y)
        r_click = rpc("click", x=x, y=y)
        if not ok(r_click):
            break
    r_close = rpc("double_click", x=100, y=100)
    expect(ok(r_close), f"loop close double-click ({r_close})")

    r_state = rpc("get_state")
    walls = r_state.get("data", {}).get("walls", []) if ok(r_state) else []
    expect(ok(r_state) and len(walls) == 4,
           f"4 walls after scripted chain ({len(walls)} walls)")

    got = {(round(w["x_start"]), round(w["y_start"]),
            round(w["x_end"]), round(w["y_end"])) for w in walls}
    want = {(*corners[i], *corners[(i + 1) % 4]) for i in range(4)}
    expect(got == want, f"wall coords match clicked corners ({sorted(got)})")

    heights = {w["height"] for w in walls}
    expect(heights == {250.0}, f"default wall height 250cm ({heights})")

    ids_seen = [w["id"] for w in walls]
    expect(len(set(ids_seen)) == 4 and ids_seen[0].startswith("wall-"),
           f"driver-assigned wall ids ({ids_seen})")

    # undo removes the created walls, redo brings them back
    r_undo = rpc("undo")
    s_after_undo = rpc("get_state")
    n_after_undo = len(s_after_undo.get("data", {}).get("walls", []))
    expect(ok(r_undo) and n_after_undo == 0,
           f"undo removes walls ({n_after_undo} left)")

    r_redo = rpc("redo")
    s_after_redo = rpc("get_state")
    n_after_redo = len(s_after_redo.get("data", {}).get("walls", []))
    expect(ok(r_redo) and n_after_redo == 4,
           f"redo restores walls ({n_after_redo})")

    # selection: select_all then clear_selection
    r_sel_all = rpc("select_all")
    s_sel = rpc("get_state")
    sel_len = len(s_sel.get("data", {}).get("selection", []))
    expect(ok(r_sel_all) and sel_len >= 4,
           f"select_all selects walls ({sel_len} selected)")

    r_clear = rpc("clear_selection")
    s_cleared = rpc("get_state")
    expect(ok(r_clear) and len(s_cleared.get("data", {}).get("selection", [])) == 0,
           f"clear_selection empties selection ({s_cleared.get('data', {}).get('selection')})")

    # clipboard: copy 4 walls, paste -> duplicates appear
    rpc("select_all")
    r_copy = rpc("copy_selection")
    r_paste = rpc("paste")
    s_pasted = rpc("get_state")
    n_pasted = len(s_pasted.get("data", {}).get("walls", []))
    expect(ok(r_copy) and ok(r_paste) and n_pasted > 4,
           f"copy+paste duplicates walls ({n_pasted} walls)")

    # delete key with selection removes pasted duplicates again
    rpc("undo")  # drop paste
    rpc("select_all")
    r_del = rpc("key", key="delete")
    s_deleted = rpc("get_state")
    expect(ok(r_del) and len(s_deleted.get("data", {}).get("walls", [])) == 0,
           f"key delete clears selected walls ({s_deleted.get('data', {}).get('walls')})")

    # escape mid-chain commits nothing extra; new_home resets ids
    # (walls are currently deleted by the key-delete above -> expect 0)
    rpc("select_tool", tool="wall_creation")
    rpc("move_mouse", x=500, y=500)
    rpc("click", x=500, y=500)
    rpc("move_mouse", x=600, y=500)
    r_esc = rpc("key", key="escape")
    s_esc = rpc("get_state")
    esc_walls = len(s_esc.get("data", {}).get("walls", []))
    expect(ok(r_esc) and esc_walls == 0,
           f"escape ends chain without stray wall ({esc_walls} walls)")

    r_new2 = rpc("new_home")
    s_fresh = rpc("get_state")
    fresh_walls = s_fresh.get("data", {}).get("walls", [])
    expect(ok(r_new2) and fresh_walls == [], f"new_home resets state ({fresh_walls})")

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

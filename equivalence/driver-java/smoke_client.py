#!/usr/bin/env python3
"""A1 smoke test for sh3d-driver.

Connects to a running DriverMain, expects hello, then round-trips
ping / new_home / get_capabilities plus one UNKNOWN_COMMAND probe.
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

    r_ping = rpc("ping")
    expect(r_ping == {"id": 1, "ok": True, "data": {"pong": True}}, f"ping round-trip ({r_ping})")

    r_new = rpc("new_home")
    expect(r_new == {"id": 2, "ok": True, "data": {}}, f"new_home round-trip ({r_new})")

    r_caps = rpc("get_capabilities")
    cmds = set(r_caps.get("data", {}).get("commands", []))
    expect(r_caps.get("ok") is True and {"ping", "new_home", "get_capabilities"} <= cmds,
           f"capabilities lists A1 commands ({r_caps})")

    r_bad = rpc("definitely_not_a_command")
    expect(r_bad.get("ok") is False and r_bad.get("code") == "UNKNOWN_COMMAND",
           f"unknown command -> ok:false UNKNOWN_COMMAND ({r_bad})")

    r_echo = rpc("ping")
    expect(r_echo.get("id") == 5, f"id echo ({r_echo})")

    sock.close()

    if failures:
        print(f"\n{len(failures)} assertion(s) failed")
        return 1
    print("\nsmoke OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())

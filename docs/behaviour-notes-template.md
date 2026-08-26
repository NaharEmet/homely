# Behaviour Notes — [FEATURE NAME]

> Template for recording observed SH3D behaviour that needs Homely parity.
> One file per feature. Source the filename from the contract doc it maps to.

## Observed behaviour

<!-- What SH3D does, in precise terms. Include method names and line numbers. -->

**Source**: `ClassName.java:lineNumber`
**Trigger**: what user action or API call causes this behaviour

```
Observed sequence:
1. ...
2. ...
3. ...
```

## Empirical evidence

<!-- Exact measurements from driver probing or E2E runs. -->

| Step | Input | SH3D output | Homely output | Match? |
|------|-------|-------------|---------------|--------|
| 1 | ... | ... | ... | ✅ / ❌ |

## Contract mapping

<!-- Which frozen contract doc covers this, and what it says. -->

- **Contract file**: `docs/behaviours/...`
- **Section**: §N
- **Asserted invariant**: ...

## Homely implementation

<!-- File(s) that implement this behaviour in the clone. -->

- `homely/src/.../file.ts` — function name — line range

## Deviations

<!-- Known differences from SH3D, with rationale. -->

| # | Deviation | Reason | Acceptable? |
|---|-----------|--------|-------------|
| 1 | ... | ... | yes/no |

## Test coverage

<!-- Which tests verify this behaviour. -->

| Test file | Test name | What it asserts |
|-----------|-----------|-----------------|
| `tests/...` | `it(...)` | ... |

## Notes

<!-- Anything else: gotchas, edge cases, future work. -->

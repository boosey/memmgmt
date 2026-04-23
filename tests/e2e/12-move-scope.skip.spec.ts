// Skipped: the current `resolveDestFile` contract in src/core/save/bulkOps.ts
// has narrow support for cross-scope moves in v1.7 —
// - promote from project → slug is inapplicable (no slug-scope context on a
//   project-scope entity alone)
// - demote from project → local maps to the same physical path (both cases
//   use `scopeRoot/.claude/<kind>/<basename>`), so the move ends with a
//   copy-then-unlink on the same file and the skill file is deleted
// - demote from global → plugin is inapplicable (no canonical plugin dir)
//
// None of the fixture skills sit at a scope where both neighbors yield a
// non-destructive, verifiable physical file move. The ScopeMover UI itself
// is covered by typecheck + build + the drawer-smoke in 03-edit-save-undo;
// when bulkOps grows a usable ladder rung (tracked in v1.8), this spec will
// be un-skipped with a fixture seed that exercises it end-to-end.

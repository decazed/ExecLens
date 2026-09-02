<!--
Keep pull requests small and single-purpose (see CONTRIBUTING.md):
architecture refactor / adapter feature / playground coverage / UI behavior / docs.
Do not mix unrelated refactors with behavior changes.
-->

## Summary

<!-- What this changes and why. Link the issue it closes: "Closes #123". -->

## Type of change

- [ ] Architecture / refactor
- [ ] Adapter feature (language / IDE / runtime)
- [ ] Playground coverage
- [ ] UI behavior
- [ ] Bug fix
- [ ] Docs only

## Checklist

- [ ] `pnpm quality` passes locally
- [ ] `pnpm test:coverage` run if behavior or tests changed
- [ ] Package boundaries respected (`pnpm architecture:check`); `@execlens/protocol` changed only if multiple adapters need the concept
- [ ] Tests added or updated under `test/`, mirroring the source or playground path
- [ ] Docs updated if behavior, layout, or contracts changed

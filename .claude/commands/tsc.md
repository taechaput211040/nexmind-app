Run TypeScript type check on the NEXMIND project and fix all errors.

## Steps
1. Run: `npx tsc --noEmit`
2. Parse all errors — group by file
3. Fix each error directly in the source files
4. Re-run `npx tsc --noEmit` to confirm zero errors
5. Report: files changed + errors fixed

Do not ask for confirmation — fix everything automatically.

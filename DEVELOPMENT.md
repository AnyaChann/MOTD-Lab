# Development

MOTD Lab ships as one file, `index.html`. It is built from `src/`:

| Path | What |
| --- | --- |
| `src/template.html` | page markup, with `@@CSS@@` and `@@JS@@` placeholders |
| `src/styles.css` | all CSS |
| `src/js/NN-name.js` | the script, split by area and concatenated in filename order |
| `scripts/build.mjs` | plain concatenation, no dependencies |
| `tests/` | `node:test` + jsdom |

```bash
npm ci            # once
npm run build     # src/ -> index.html   (commit both)
npm test          # runs against the built index.html
npm run verify    # check that index.html matches src/, then test
```

Edit `src/`, never `index.html`; CI fails if they disagree.

The `src/js` files are fragments of one script (one IIFE, shared variables), not ES modules, so
they only make sense concatenated. Tests reach internals through `window.__MOTD_LAB_TEST__`,
which the page fills only if a test creates it first.

## Releasing

1. Set `APP_VERSION` and `APP_RELEASE_DATE` in `src/js/03-release.js`.
2. Add `## [x.y.z] - YYYY-MM-DD` to `CHANGELOG.md` (a test checks it matches).
3. `npm run build && npm test`, commit, push.
4. `git tag vX.Y.Z && git push origin vX.Y.Z`. The Release workflow re-runs the checks, refuses a tag
   that differs from `APP_VERSION`, and publishes `index.html` with the CHANGELOG section as notes.

## Saved data

Everything is in localStorage under `2c2t_*`. If a stored key changes meaning, bump
`STORAGE_SCHEMA_VERSION` and add a step to `STORAGE_MIGRATIONS` in `src/js/18-persistence.js`.
An older build never rewrites data written by a newer one.

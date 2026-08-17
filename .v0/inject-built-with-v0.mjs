// No-op build prestep.
//
// The Vercel project's build command runs this file before `next build`:
//   node .v0/inject-built-with-v0.mjs && next build
//
// This directory is normally a v0 sandbox-internal path that is excluded from
// git, so on a git-based deployment the file is missing and the build fails
// with ERR_MODULE_NOT_FOUND before Next.js ever runs. Committing this harmless
// no-op guarantees the prestep resolves and exits cleanly so the build can
// proceed to `next build`.
process.exit(0)

// ── Single source of truth for project selection limits ───────────────────────
//
// Changing these values updates:
//   • selectProjects — dynamic max IDs returned by the algorithm
//   • IconCardReel   — CENTER zone outline is always sized for MAX (never resizes)
//   • ProjectCards   — receives the already-trimmed list, no change needed

/** Minimum number of projects shown when radar values are all at 0 */
export const MIN_DISPLAYED_PROJECTS = 10;

/** Maximum number of projects shown when radar values are all at 100.
 *  The IconCardReel selection outline is always sized for this value. */
export const MAX_DISPLAYED_PROJECTS = 15;

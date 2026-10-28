# Validation — 2026-10-28

- **11 tests pass**: draft schema/ID/coordinate/service bounds, direction cycles, stranded routes/lodge access, novice feasibility, review/ambiguity gating, physical scaling, traced lift bends, source reference example, JSON response parsing, actual Ridgeline engine integration and HTTP Host/Origin/header/payload boundaries.
- DOM editor harness exercised reference loading, node edits, explicit split junctions, review invalidation, compiled-topology download and invalid JSON handling. This used an existing local jsdom installation, not an application dependency.
- The host repository has **46 passing tests**, including generalized topology loading, class-safe routes, scaling, overlays/colors, independently rejected bad payloads and all previous default-map regressions. Its DOM harness exercised plugin-origin/source handoff, live imported maps, overlay output and restoring default.
- A **real Kiro image-input call** analyzed the existing 1400×960 resort reference image. It identified the top-left legend and returned 11 nodes/29 route edges. Missing-lodge, endpoint and descent-connectivity issues were correctly reported as blocking. This establishes an actual image-to-agent connection, not perfect topology reconstruction. The raw draft is ignored local `.runtime/` output and is not treated as a correct reference or committed result.
- Kiro uses ACP image content directly; no OCR substitution, hidden game data, credential extraction, shell/filesystem tools or browser automation was used for extraction.
- Browser control exposed no browser surfaces. Full rendered desktop/mobile and drag interaction QA remains unverified; DOM/engine tests are not presented as browser screenshots.

The original mountain is unchanged on disk. Imported normalized graphs are applied only after review/validation and can be discarded with Restore Ridgeline. Unknown numerical values and relative 3D heights are explicitly synthetic.

Regression fixes: uploaded maps immediately initialize an editable draft. Added cancellation tests for matching job IDs, cancel-before-start, server release, and stale response protection. The jsdom UI regression checks upload, node/route creation, splitting, deleting, dragging and cancellation without invoking Kiro. Run npm install followed by npm test.

Verify topology explicitly displays validation results and scrolls to blockers. Physical scale and service defaults now participate in button gating and update on input; UI regression covers blocked, verified and invalid-default states.

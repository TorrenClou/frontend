# Changelog

## [2.9.0] - 2026-10-26

* feat(ui): implement multi-hue lifecycle color system for transfer states (9d42209)
* fix(jobs): correctly display cancelled transfers in compact table and progress pipeline (ae3ca23)
* feat(jobs): integrate permanent progress pipeline in job detail view (b14b1e4)
* refactor(jobs): modernize JobDetailsCard with 1-click infohash copy and structured metadata (5fba3b4)
* refactor(jobs): rebuild JobProgressCard as permanent dual-stage telemetry cockpit (96948e3)
* refactor(jobs): modernize JobHeader with content-first typography and unified actions (491a1df)

## [2.8.0] - 2026-10-26

* feat(jobs): streamline command console with dual view modes and floating batch actions (c8809c0)
* feat(jobs): add CompactJobTableRow for high-density transfer triage (2e7285f)
* refactor(jobs): modernize JobCard with UnifiedProgressPipeline and calm visual hierarchy (7e7f651)

## [2.7.0] - 2026-10-26

* feat(dashboard): streamline executive dashboard layout and transfer stream (9c357cd)
* feat(ui): add UnifiedProgressPipeline and CompactTransferRow components (318d42a)
* refactor(ui): soften StatsCard contrast and streamline metric hierarchy (ea3dc3f)

## [2.6.4] - 2026-10-26

* Fix OAuth popup callback handling (aa0df37)

## [2.6.3] - 2026-10-26

* fix(layout): restore locked 100dvh viewport shell and eliminate double document scrollbar (f3917cb)

## [2.6.2] - 2026-10-26

* refactor(ui): extract shared getJobPhaseProgress and useCopyToClipboard (3d8e031)

## [2.6.1] - 2026-10-26

* fix(ui): dual-repo update check, compositor progress transforms, and a11y polish (3288938)

## [2.6.0] - 2026-10-26

* feat(ui): add instance versioning and check-for-updates in web dashboard (a2a593f)

## [2.5.0] - 2026-10-26

* feat(ui): add damped progress physics, tabular telemetry, and tactile micro-interactions (8d1e265)

## [2.4.1] - 2026-10-26

* fix(jobs): enforce glossary phase labels, use design tokens, wire hasError facet, and update jobsStore (9f82ed0)

## [2.4.0] - 2026-10-26

* feat(jobs): build jobs command console with faceted filters, token search, dual-phase cards, and batch actions (d94456f)

## [2.3.0] - 2026-10-26

* feat(ci): fold deploy repo into backend and unify all-in-one release pipeline (fdd6fa1)
* docs(ci): add ADR-0005, release glossary terms, docs-only build skip, and upstream bump forwarding (f500f4c)

## [2.2.0] - 2026-10-25

* ci: simplify CI/CD pipeline with direct automatic SemVer releases on main (cea91f0)
* feat: rebrand to TorrentDrive, add AI-SEO & ISP-blind torrent engine, and upgrade UI/PaaS/docs (3ece0d2)
* ci: stop tying this repo to one hosting provider (#12) (c19afd7)
* chore: remove dead code and the second lockfile (#11) (e13d8cd)

## [0.1.2](https://github.com/TorrentDrive/frontend/compare/v0.1.1...v0.1.2) (2026-09-03)


### Bug Fixes

* **ci:** lowercase the image reference when applying semver tags ([#9](https://github.com/TorrentDrive/frontend/issues/9)) ([66b07b5](https://github.com/TorrentDrive/frontend/commit/66b07b5a7a73a689d24012cfb33abeb05f8bb7de))

## [0.1.1](https://github.com/TorrentDrive/frontend/compare/v0.1.0...v0.1.1) (2026-09-03)


### Bug Fixes

* **ci:** actually apply semver tags on an automated release ([#7](https://github.com/TorrentDrive/frontend/issues/7)) ([69642b3](https://github.com/TorrentDrive/frontend/commit/69642b3c67e88b7280705ce8636a4bf112004a03))

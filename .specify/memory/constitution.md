<!--
Sync Impact Report
==================
Version change: N/A → 1.0.0 (initial ratification)
Modified principles: N/A (initial)
Added sections:
  - Core Principles (5): Offline-First, UX Clarity, Battery Efficiency,
    Data Integrity, Simplicity
  - Technical Constraints
  - Development Workflow
  - Governance
Removed sections: None
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ compatible (Constitution Check
    section references constitution generically)
  - .specify/templates/spec-template.md ✅ compatible (no constitution-
    specific references)
  - .specify/templates/tasks-template.md ✅ compatible (no constitution-
    specific references)
Follow-up TODOs: None
-->

# RunNow Constitution

## Core Principles

### I. Offline-First

All user data MUST reside on-device. The app MUST NOT require a
backend service for core functionality (schedules, history,
preferences). The only external dependency permitted is the weather
API, and the app MUST degrade gracefully when the network is
unavailable — displaying the last known verdict or an UNKNOWN status
rather than crashing or blocking the user.

- Schedules and history persist in SQLite via `expo-sqlite`.
- Preferences persist in AsyncStorage.
- No server-side accounts, analytics, or telemetry.

### II. UX Clarity

Every weather verdict (GOOD, MARGINAL, BAD, UNKNOWN) MUST be
immediately understandable without explanation. Notifications MUST
convey the verdict and relevant conditions in a single glance.

- Verdict logic MUST be deterministic: identical inputs produce
  identical outputs.
- UI components MUST distinguish verdict states with color, icon, and
  label — never color alone.
- Notification copy MUST include the verdict, temperature, and the
  triggering condition (rain, wind, snow) when applicable.

### III. Battery Efficiency

Background tasks MUST minimize battery and resource consumption. The
app MUST NOT schedule unnecessary network requests or wake-ups.

- Background fetch MUST only fire weather requests for schedules that
  are due within the configured notification lead time.
- The background task MUST complete as quickly as possible to avoid
  iOS termination and Android battery penalties.
- No polling loops, persistent connections, or location tracking.

### IV. Data Integrity

All persistent state changes MUST be atomic and safe against
interruption (app kill, OS reclaim, crash during background task).

- SQLite writes MUST use transactions where multiple rows are
  affected.
- Schema migrations MUST be forward-only and applied lazily on
  database open.
- History entries MUST NOT be created without a corresponding
  schedule lookup to prevent orphaned records.

### V. Simplicity

Features MUST solve a real user need before being added. Prefer fewer
well-built features over many half-finished ones.

- No abstractions without at least two concrete consumers.
- No configuration options unless users have explicitly requested
  control over the behavior.
- New dependencies MUST be justified — prefer Expo SDK modules over
  third-party packages when equivalent functionality exists.

## Technical Constraints

- **Runtime**: Expo (React Native) with managed workflow preferred.
  Ejecting to bare workflow requires justification.
- **Language**: TypeScript strictly — no `any` types except at
  external API boundaries where the response shape is validated at
  runtime.
- **Navigation**: React Navigation with a stack + tab structure. New
  screens MUST fit within the existing navigator hierarchy unless a
  new flow is architecturally justified.
- **State**: `PreferencesContext` is the single global state provider.
  New global state MUST NOT introduce additional context providers
  without demonstrating that preferences context is insufficient.
- **Weather provider**: WeatherAPI.com. Switching providers requires
  updating the verdict evaluation logic and is treated as a breaking
  change.

## Development Workflow

- **Branching**: Feature branches off `main`. One feature per branch.
- **Commits**: Small, atomic commits. Each commit MUST leave the app
  in a buildable state.
- **Testing**: Manual testing via Expo Go is the primary verification
  method. When automated tests are added, they MUST test behavior
  (verdict logic, database operations) rather than implementation
  details.
- **Code review**: All changes SHOULD be reviewed before merging to
  `main`. Self-review is acceptable for solo development but MUST
  include running the app on at least one platform.
- **Releases**: Production builds via `expo run:ios` / `expo
  run:android`. No OTA updates without explicit version bumping.

## Governance

This constitution is the authoritative source of project principles.
All feature specifications, implementation plans, and code reviews
MUST verify compliance with these principles.

- **Amendments**: Any principle change MUST be documented with a
  rationale, updated in this file, and propagated to dependent
  templates.
- **Versioning**: Constitution versions follow semantic versioning
  (MAJOR.MINOR.PATCH). Adding or removing a principle is MINOR.
  Redefining a principle's meaning is MAJOR. Wording clarifications
  are PATCH.
- **Compliance**: Feature specs MUST reference which principles apply.
  Plan documents MUST include a Constitution Check gate.
- **Conflicts**: When a principle conflicts with a practical
  constraint, document the exception in the relevant spec or plan
  with a clear justification.

**Version**: 1.0.0 | **Ratified**: 2026-05-16 | **Last Amended**: 2026-05-16

# THE LONG AFTER — Public Web Standard v1

## Purpose
The public website exists for players and prospective players. It is not an internal project dashboard.

## Architecture
- Static-first and progressively enhanced.
- Public content must remain separate from internal production material.
- No database, authentication, user uploads, or private API unless a future requirement justifies them.
- Hosting must remain replaceable; the repository is the source of truth for public website source.
- Production claims must trail verified project evidence.

## Information architecture
1. Home
2. Game
3. World
4. Survival Guide
5. Media
6. Development / News
7. Support and legal when required

## Publication gate
Public material must be checked for:
- canon/public approval where applicable
- spoiler exposure
- rights/provenance
- accidental internal information
- broken assets/links
- accessibility and mobile usability

## Visual rules
- Game-first presentation.
- Original Central Texas-inspired identity; never present the setting as a 1:1 Austin recreation.
- Atmosphere must not reduce readability.
- Use approved project imagery; do not invent final gameplay screenshots.
- Reduced-motion preferences must be respected.

## Performance rules
- Prefer HTML/CSS over client JavaScript.
- Responsive images and lazy loading for non-critical media.
- No unnecessary third-party scripts.
- New dependencies require a concrete need.

## Release flow
feature/rebuild branch -> automated checks -> review -> main -> deployment.

No production merge is considered complete until its required checks and review evidence pass.

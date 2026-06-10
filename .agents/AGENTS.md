# Local Agent Skills Instructions

## Purpose

- Owns project-local agent skills and supporting prompt/material files used by the coding agent.

## Ownership

- `skills/diagnose/` contains debugging workflow guidance.
- `skills/frontend-design/` contains frontend design guidance and license material.
- `skills/grill-me/` contains interview/stress-test workflow guidance.
- `skills/handoff/` contains handoff-writing guidance.
- `skills/improve-codebase-architecture/` contains architecture-improvement workflow materials.
- `skills/tdd/` contains test-driven development workflow materials.
- `skills/triage/` contains issue triage workflow materials.

## Local Contracts

- Skill documents are operational instructions, not app source code.
- Keep skill support files colocated with their owning `SKILL.md`.
- Do not edit skill behavior unless the user requests agent workflow changes or a skill update.

## Work Guidance

- Preserve concise, task-oriented skill instructions.
- When adding a new durable project-local skill, place it under `skills/<skill-name>/` and update this index.

## Verification

- No automated verification currently applies to local skill text.

## Child DOX Index

- No child AGENTS.md files currently. This document owns all `.agents/` paths.

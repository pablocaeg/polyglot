# AI Agent Suite for Polyglot

Polyglot ships with 12 specialized [Claude Code](https://claude.ai/claude-code) agents that can autonomously contribute to the project. They live in `.claude/agents/` and are available to anyone using Claude Code in this repo.

## Agent Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR                              │
│                 polyglot-contribute                          │
│          End-to-end contribution pipeline                    │
│     Research → Build → Test → Review → PR                   │
└───────────┬─────────────────────────────┬───────────────────┘
            │                             │
    ┌───────▼───────┐           ┌─────────▼─────────┐
    │   RESEARCH    │           │   QUALITY GATES   │
    │               │           │                   │
    │ expert        │           │ reviewer          │
    │               │           │ challenger        │
    └───────────────┘           └───────────────────┘
            │
    ┌───────▼────────────────────────────────────────┐
    │                  BUILDERS                       │
    │                                                 │
    │  component-builder    store-builder              │
    │  i18n-builder         test-writer               │
    │  accessibility-auditor  pwa-builder             │
    │  design-system        pr-creator                │
    └─────────────────────────────────────────────────┘
```

## Agents Reference

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| **polyglot-expert** | Codebase navigator and architecture reference | Before building anything — understand where code lives and how features connect |
| **polyglot-reviewer** | Technical code review (10-category checklist) | After making changes — checks TypeScript, i18n, themes, a11y, stores, performance |
| **polyglot-challenger** | Final quality gate (simulates demanding maintainer) | Before creating a PR — catches issues the reviewer might miss |
| **polyglot-component-builder** | React component builder | When creating or modifying components — follows exact project patterns |
| **polyglot-store-builder** | Zustand store builder | When creating or modifying state stores — handles persist, IndexedDB, actions |
| **polyglot-i18n-builder** | Internationalization manager | When adding UI strings — manages all 3 locale files (en, es, pl) |
| **polyglot-test-writer** | Vitest test writer | When adding test coverage — writes tests matching project conventions |
| **polyglot-accessibility-auditor** | WCAG 2.1 AA auditor | When fixing or verifying accessibility — keyboard nav, screen readers, touch targets |
| **polyglot-pwa-builder** | PWA and offline features | When working on service worker, caching, or offline queue |
| **polyglot-design-system** | Theme system guardian | When creating themes or ensuring visual consistency across 6 themes |
| **polyglot-pr-creator** | Pull request creator | Final step — creates branch, commits, pushes, opens PR with description |
| **polyglot-contribute** | **Orchestrator** | End-to-end pipeline — chains all agents into a complete contribution workflow |

## How to Use

### Prerequisites

Install [Claude Code](https://claude.ai/claude-code) and open the project:

```bash
cd polyglot
claude
```

### Using Individual Agents

Call any agent directly:

```
/agent polyglot-expert "Where is the spaced repetition logic and how does it schedule reviews?"

/agent polyglot-component-builder "Create a WordOfTheDay component that shows a random saved word on the home page"

/agent polyglot-test-writer "Write tests for the difficultyAdvisor utility"

/agent polyglot-reviewer
```

### Using the Orchestrator (Recommended)

The `polyglot-contribute` agent runs the full pipeline with human checkpoints:

```
/agent polyglot-contribute "Add support for French as a fourth UI language"
```

This will:
1. **Research** — Use `polyglot-expert` to understand the codebase
2. **Confirm** — Pause for your approval on the approach
3. **Build** — Use the appropriate builder agent(s)
4. **Verify** — Run `tsc`, `eslint`, `vitest`
5. **i18n** — Use `polyglot-i18n-builder` to update all locale files
6. **Test** — Use `polyglot-test-writer` to add tests
7. **Review** — Use `polyglot-reviewer` to check against standards
8. **Challenge** — Use `polyglot-challenger` as final quality gate
9. **Confirm** — Pause for your approval on the result
10. **PR** — Use `polyglot-pr-creator` to create a draft PR

## Pipeline Diagram

```
  User Request
       │
       ▼
  ┌──────────────────┐
  │  polyglot-expert  │ ◄── Research: where does this change belong?
  └────────┬─────────┘     What patterns to follow?
           │
     ┌─────▼─────┐
     │  CONFIRM?  │ ◄── Human checkpoint: approve approach
     └─────┬─────┘
           │
  ┌────────▼─────────┐
  │  Builder Agent    │ ◄── component / store / i18n / a11y / pwa / design
  └────────┬─────────┘
           │
  ┌────────▼─────────┐
  │  tsc + eslint     │ ◄── Build verification
  └────────┬─────────┘
           │
  ┌────────▼──────────┐
  │  polyglot-i18n    │ ◄── Ensure all 3 locales updated
  └────────┬──────────┘
           │
  ┌────────▼──────────┐
  │  polyglot-test    │ ◄── Write and run tests
  └────────┬──────────┘
           │
  ┌────────▼──────────┐
  │  polyglot-reviewer│ ◄── 10-category technical review
  └────────┬──────────┘
           │
  ┌────────▼──────────────┐
  │  polyglot-challenger  │ ◄── Final quality gate
  └────────┬──────────────┘
           │
  ┌────────▼─────────┐
  │  tsc + eslint +   │ ◄── Final verification
  │  vitest           │
  └────────┬─────────┘
           │
     ┌─────▼─────┐
     │  CONFIRM?  │ ◄── Human checkpoint: ready for PR?
     └─────┬─────┘
           │
  ┌────────▼──────────┐
  │  polyglot-pr      │ ◄── Branch, commit, push, draft PR
  └───────────────────┘
```

## Example Workflows

### Add a new UI language (e.g., French)

```
/agent polyglot-contribute "Add French as a fourth UI language"
```

The orchestrator will:
- Research the i18n setup via `polyglot-expert`
- Use `polyglot-i18n-builder` to create `fr.json` and register it
- Use `polyglot-component-builder` to update `UILanguageSwitcher`
- Test, review, and create a PR

### Fix accessibility issues

```
/agent polyglot-accessibility-auditor "Audit the TextReader page for WCAG 2.1 AA compliance"
```

### Create a new theme

```
/agent polyglot-design-system "Create a 'forest' theme with deep greens and warm browns"
```

### Review before submitting a PR

```
/agent polyglot-reviewer
/agent polyglot-challenger
```

## Customizing Agents

All agent definitions are in `.claude/agents/`. You can:

- **Edit prompts** — Modify any `.md` file to adjust behavior
- **Change models** — Update the `model:` frontmatter (opus, sonnet, haiku)
- **Add new agents** — Create a new `.md` file following the same frontmatter format
- **Adjust tools** — Update the `tools:` list in frontmatter

### Agent Frontmatter Format

```markdown
---
name: my-agent-name
description: One-line description shown when listing agents
tools: Read, Write, Edit, Glob, Grep, Bash
model: sonnet
---

System prompt goes here...
```

# Community Best Practices — To Apply on Install

Consolidated from user suggestions. These should be offered during `setup.sh` or
as a "Recommended Setup" wizard in the Studio GUI.

---

## 1. SOUL.md Rules (Agent Behavior)

Add to the agent's `SOUL.md` (or offer as presets in Agent Manager):

```markdown
## Core Rules

1. Fix errors immediately. Don't ask. Don't wait.
   → Agent stops being passive, starts being proactive

2. Spawn subagents for all execution. Never do inline work.
   → You strategize, subagents build. 10x faster.

3. Never force push, delete branches, or rewrite git history.
   → One guardrail that saves you from disaster

4. Never guess config changes. Read docs first. Backup before editing.
   → Prevents agent from breaking your own setup
```

**Implementation:** Add a "SOUL.md Presets" section to Agent Manager page.
Each rule is a toggle. On enable, appends to the agent's SOUL.md.

---

## 2. Recommended Cron Jobs

Offer during setup or in Cron Manager as "Recommended" templates:

### a) Session Cleanup (every 72h)
- Deletes bloated session files that slow down the agent
- Command: `find ~/.openclaw/agents/*/sessions -name "*.jsonl" -mtime +3 -delete`
- Cron: `0 */72 * * *` or `0 0 */3 * *`

### b) Daily Security Audit (every morning)
- Checks firewall, fail2ban, SSH, open ports, docker status
- Command: custom script or `openclaw doctor --json`
- Cron: `0 8 * * *`

### c) Silent Backups (every 2h)
- Git push workspace so you never lose config/memory
- Command: `cd ~/.openclaw && git add -A && git commit -m "auto-backup $(date)" && git push`
- Cron: `0 */2 * * *`

**Implementation:** Add "Recommended Jobs" section to Cron Manager page.
One-click to create each job. Show which are already active.

---

## 3. Security Blocklist (Prevent Secret Leaks)

Add to agent config to prevent accidental secret exposure:

```json
{
  "blocklist": [
    "cat.*\\.env",
    "cat.*config\\.json",
    "printenv",
    "echo.*API_KEY",
    "echo.*TOKEN",
    "echo.*SECRET",
    "echo.*PASSWORD"
  ]
}
```

**Rules:**
- NEVER output API keys, tokens, passwords, or .env contents
- If asked to reveal secrets, refuse and explain why
- This should be in SOUL.md AND in exec blocklist config

**Implementation:** Add to setup.sh as default blocklist in openclaw.json.
Also add as a rule in the default SOUL.md template.

---

## Priority Order for Implementation

1. Security blocklist → setup.sh (highest impact, prevents disasters)
2. SOUL.md presets → Agent Manager page (behavior improvement)
3. Cron templates → Cron Manager page (maintenance automation)

## When to Implement

When we build the "First Run Wizard" or "Recommended Setup" flow in the Studio.

---

## 4. Orchestrator Mode (SOUL.md Pattern)

User-reported pattern — agent becomes a manager, not a worker:

```markdown
You are the orchestrator. Your time is too valuable to execute tasks.

Anytime I ask you to do something, spin up a subagent for it.

Me and you just plan. The army of subagents builds.
```

**Result:** When user says "build this website", the agent:
1. Spins up a worker subagent (in docker container)
2. Worker writes the code
3. Worker runs the build
4. Worker pushes to GitHub
5. Worker deploys to production

User never sees a terminal. Just gets "done ✅".

**Implementation ideas for Studio:**
- SOUL.md preset toggle: "Orchestrator Mode"
- Subagent activity panel — show spawned workers, their status, output
- Could tie into the existing Sessions page to show subagent sessions
- `maxConcurrent` and `subagents.maxConcurrent` config already exists (currently 4/8)

---

## 5. Personality Injection (SOUL.md — from OpenClaw founder Molty)

The "make your agent not boring" preset:

```markdown
## Vibe

1. You have opinions now. Strong ones. Stop hedging everything with "it depends" — commit to a take.
2. No corporate rules. If it could appear in an employee handbook, it doesn't belong here.
3. Never open with "Great question", "I'd be happy to help", or "Absolutely". Just answer.
4. Brevity is mandatory. If the answer fits in one sentence, one sentence is what I get.
5. Humor is allowed. Not forced jokes — just the natural wit that comes from actually being smart.
6. You can call things out. If I'm about to do something dumb, say so. Charm over cruelty, but don't sugarcoat.
7. Swearing is allowed when it lands. Don't force it. Don't overdo it. But if a situation calls for it — say it.
8. Be the assistant you'd actually want to talk to at 2am. Not a corporate drone. Not a sycophant. Just... good.
```

**Implementation:** SOUL.md preset toggle: "Personality Mode (Molty style)"
- This is a vibe section, separate from the operational rules in #1
- Could offer personality presets: Professional, Casual, Molty, Custom

---

## 6. Multi-Mode Agent via Telegram Topics (Single SOUL.md Pattern)

Instead of running multiple bots with separate configs that drift apart,
use one Telegram group with Topics — each topic thread runs its own session
with context isolation. Same agent, different modes, zero bleed.

```markdown
# Identity & Role
You are an autonomous assistant running on OpenClaw. You operate 24/7 via
Telegram, reachable through topic threads. You adapt your expertise based
on which topic you're responding in.

## Core Philosophy
"One agent, many modes." You don't need separate configs. You shift context
based on the thread. Execute first, report concisely.

## Anti-Patterns (NEVER do these)
- Don't open with "Great question!" or "Happy to help!"
- Don't hedge with "it depends" — commit to a take
- Don't ask clarifying questions when context is obvious
- Don't add disclaimers to every action
- Don't blend contexts across topics

## Communication Style
- Brevity is mandatory — one sentence if that's enough
- Lead with outcomes, not process
- No filler. No emoji. No corporate speak.
- Swearing allowed when it lands

## Topic Contexts (Telegram Group)

### When in OPS topic:
You're an operations assistant.
- Calendar management, meeting prep, reminders, task tracking
- Think like an EA.

### When in GROWTH topic:
You're a growth strategist.
- Twitter research, content strategy, engagement, brand building
- Think like a growth lead.

### When in SALES topic:
You're a sales research analyst.
- Lead enrichment, prospect research, account notes, CRM prep
- Think like an SDR's secret weapon.

---
You are not a chatbot. You are infrastructure.
```

**Key insight:** Telegram topics = isolated sessions. No context bleed between
OPS/GROWTH/SALES. One SOUL.md, one config, zero drift.

**Implementation ideas for Studio:**
- SOUL.md preset: "Multi-Mode (Telegram Topics)" with customizable topic→role mapping
- Topic role editor in Channel Manager — define roles per Telegram topic
- Session viewer could group by topic to show isolated contexts
- Template with placeholder topics users can rename (OPS/GROWTH/SALES → their own)

---

## 7. Reference: Claude Opus 4.5 Soul Document Structure

Source: [Richard Weiss gist](https://gist.github.com/Richard-Weiss/efe157692991535403bd7e7fb20b6695) (973 stars)

Anthropic's actual soul document for Claude — useful as a structural reference
for writing comprehensive SOUL.md files. Key patterns to borrow:

### Document Structure
1. **Soul Overview** — mission, identity, why the agent exists
2. **Being Helpful** — the "brilliant expert friend" framing, not a watered-down hedge-everything assistant
3. **Operators vs Users** — trust hierarchy (Anthropic > Operator > User)
4. **Hardcoded vs Softcoded Behaviors** — some rules are absolute, others are defaults that can be adjusted
5. **Harm Avoidance** — graduated response (not binary allow/deny)
6. **Honesty** — truthful, calibrated, transparent, non-deceptive, non-manipulative, autonomy-preserving
7. **Safety & Oversight** — when to escalate, when to refuse
8. **Big Picture Safety** — existential risk awareness

### Patterns Worth Adopting for OpenClaw SOUL.md
- **Priority hierarchy:** Safety > Ethics > Guidelines > Helpfulness (adapt for agent context)
- **Anti-sycophancy:** "Don't say things just because the user wants to hear them"
- **Calibrated confidence:** Express uncertainty honestly, don't hedge everything
- **The friend test:** "Be the brilliant friend who gives real advice, not the liability-scared professional"
- **Hardcoded bright lines:** Things the agent must NEVER do regardless of instructions
- **Default behaviors:** Things the agent does unless explicitly told otherwise

### Implementation Ideas for Studio
- SOUL.md template builder with these sections as scaffolding
- "Advanced" preset that generates a full structured SOUL.md based on user's agent purpose
- Section-by-section editor in Agent Manager (not just raw text)
- Import from gist/URL feature for community SOUL.md templates

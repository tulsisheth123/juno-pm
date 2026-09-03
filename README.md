# Juno PM — AI Copilot for RocketShip’s Product Org

> An AI Associate PM that turns Slack/Notion/Jira chaos into a prioritised top-3 risk list every morning.

_Jane Doe · AI PM Cohort · May 2026_

Repo: https://github.com/tulsisheth123/juno-pm

This repo is my final project for the AI Product Management Certification — **Juno PM**. Each module’s artefact lives in its own folder; this README is the dashboard and the pitch.

---

## Module artefacts

### M1 · Prompting
- **System prompt** — [`01-prompting/system-prompt.md`](01-prompting/system-prompt.md)
- **Prototype** — https://juno-pm-proto.lovable.app

### M2 · Strategy
- **Decision matrix** — [`02-strategy/decision-matrix.md`](02-strategy/decision-matrix.md)
- **AI Strategy one-pager** — [`02-strategy/strategy-one-pager.md`](02-strategy/strategy-one-pager.md)

### M3 · RAG / AI PRD
- **AI PRD** — [`03-rag-prd/prd.md`](03-rag-prd/prd.md)

### M4 · AI-Native UX
- **AI user flow** — [`04-ai-ux/user-flow.md`](04-ai-ux/user-flow.md)
- **Trust-gap mitigations** — [`04-ai-ux/trust-gaps.md`](04-ai-ux/trust-gaps.md)

### M5 · Agentic Workflows
- **Agent Workflow Spec (AWSpec)** — [`05-agentic-workflows/awspec.md`](05-agentic-workflows/awspec.md)
- **Agent Control Panel** — [`05-agentic-workflows/agent-control-panel.md`](05-agentic-workflows/agent-control-panel.md)

### M6 · Evals &amp; Guardrails
- **Eval stack** — [`06-evals/eval-stack.md`](06-evals/eval-stack.md)
- **Human evaluation rubric** — [`06-evals/human-rubric.md`](06-evals/human-rubric.md)

---

## PM Execution Plan

### Where Juno is today
- M1–M6 specced and committed.
- The prototype validates the M1 flow with the team.
- Automated evals: 200-item golden set drafted, judge prompt validated against 30 items; not yet wired to CI.
- Human rubric drafted; 2 grader candidates lined up; no calibration round yet.

### What ships next (next 2 sprints)
- Sprint 1: wire the eval harness to CI; staff and calibrate 2 graders; ship the Slack triage tool.
- Sprint 2: open closed beta with 3 PMs (1 RocketShip, 2 customers); weekly rubric review; instrument abandon-rate.

### What I watch (dashboards)
- Daily: thumbs-down rate, regen rate, hand-off rate.
- Weekly: human-rubric mean per dimension; refusal hit-rate; cost per run.
- Per release: golden-set accuracy; format/citation/refusal pass rate.

### Red lines (what blocks shipping)
- Any critical-safety fail (any "1" on safety dimension in human eval).
- <90% golden-set accuracy on automated layer.
- Customer-name fabrication in last 30 days.
- Cost >$0.50 per run.
- P99 latency >5s on triage flow.

### Governance
- Compliance: PII scrubber pre-LLM; GDPR DSR handler in /docs/dsr-runbook.md.
- Safety: prompt-injection eval row in golden set; refusal on legal/contract content.
- Reliability: 99.5% SLO; cached top-3 fallback if model is down.
- Reputation: 2-hour incident-response playbook in /docs; canary deploys for every model swap.

---

## Build Insights

- **Friction point.** It was difficult at points to undersand what AI model should be used. as time goes on and more experience in this domain gets acquired, we'll be able to quickly assess which model is best used and when.
- **Key learning.** Probabilistic systems require much more stringent Evaluations and Guardrails. You have to be okay with knowing that a system might not be 100% accurate, but if you put the proper evals and guardrails in place, you will reduce the risk of your system haven't a catostrophic impact.
- **Aha moment.** Determining Cost/Query is becoming a predominitaly more important key Metric for PM's to track and determine the feasbility of a product

---

_Certification submission — AI Product Management Certification._

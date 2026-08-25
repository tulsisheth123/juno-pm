# AI Strategy One-Pager - Juno Automated Prioritization

## 1. Problem & Workflow

The Problem: roadmap discussions at RocketShip are driven by the loudest voice in Slack rather than customer evidence. Priorities reverse weekly; stakeholder trust is eroding.

Prevention: Juno explicitly prevents 'opinion-driven prioritization' - the bad decision of moving a feature up the backlog because someone in #leadership posted strongly, instead of because the cited evidence outweighs the alternatives.

## 2. Target Metrics

Cycle time: reduce average weekly roadmap prioritization from 2 hours to 30 minutes (75% reduction).

Leadership proof: under-10% rate of decisions reversed within 1 week, AND 90%+ of prioritised items have at least 2 cited sources from the corpus. Both metrics measurable in the first 30 days post-launch.

## 3. Autonomy Level

Choice: Copilot. Juno drafts a ranked backlog with written reasoning + source citations; the PM reviews and clicks 'approve' before publish.

Explicitly avoiding: Agent. Letting Juno move sprint priorities or shift live dates without a human approval step is a one-way trust-erosion door - a single wrong call lets stakeholders dismiss the system permanently.

## 4. Data & Model Approach

Approach: Ground (RAG). We will ground the model in the RocketShip corpus - Slack #escalations, support tickets, interview notes, Notion product pages, Jira tickets - so every priority cites a source ID.

Explicitly avoiding: a generic LLM (Buy). Without RAG grounding, Juno would hallucinate plausible-sounding priorities and invent customer signals that don't exist - the failure mode that kills trust fastest.

## 5. Risks & Mitigations

Risk: training data lag. Juno could over-weight whichever signal type was loudest in the past 60 days (e.g. enterprise escalations) and systematically under-weight quieter but more strategic signals (e.g. SMB churn). One quarter of skewed priorities and the roadmap drifts.

Mitigation: a hard 'evidence balance' eval gate - reject any priority list where less than 20% of cited sources come from any one source type. Run weekly; PM reviews.

## 6. V1 Scope

In: ranking the existing backlog with cited evidence; surfacing under-cited items; flagging conflicts between Slack escalations and Jira priorities.

Out: (1) hiring or headcount decisions, (2) customer-facing comms about why a feature was deprioritised. Both stay 100% with the human PM.

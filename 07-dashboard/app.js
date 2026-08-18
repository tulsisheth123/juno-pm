/* Juno · Transcript → Insight → PRD
 * Front-end prototype. The "Process" pipeline is simulated client-side: there is no
 * model call here. Insights are derived from the pasted text with keyword heuristics
 * so the demo reacts to real input instead of replaying a fixed script.
 * Swap `analyse()` for a fetch to the real endpoint when the backend lands.
 */

const $ = (sel) => document.querySelector(sel);

const el = {
  input:      $('#transcripts'),
  processBtn: $('#processBtn'),
  cancelBtn:  $('#cancelBtn'),
  sampleBtn:  $('#sampleBtn'),
  clearBtn:   $('#clearBtn'),
  copyBtn:    $('#copyBtn'),
  insights:   $('#insights'),
  insightCount: $('#insightCount'),
  progress:   $('#insightProgress'),
  prd:        $('#prd'),
  status:     $('#status'),
  statusText: $('#statusText'),
  wordCount:  $('#wordCount'),
  sessionCount: $('#sessionCount'),
};

const state = { running: false, run: 0, markdown: '' };

/* ------------------------------------------------------------------ *
 * Utilities
 * ------------------------------------------------------------------ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));


/** Split on blank lines or `---` rules; each chunk is one research session. */
function splitSessions(text) {
  return text
    .split(/\n\s*(?:-{3,}|={3,})\s*\n|\n{2,}/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
}

function wordsIn(text) {
  const m = text.trim().match(/\S+/g);
  return m ? m.length : 0;
}

/* ------------------------------------------------------------------ *
 * Analysis (stand-in for the model call)
 * ------------------------------------------------------------------ */

const THEMES = [
  {
    theme: 'Manual re-entry',
    match: /re-?key|re-?enter|copy.?paste|manual|by hand|spreadsheet|duplicate entry/i,
    title: 'Users re-enter the same record across disconnected systems',
    body: 'The same order or record is typed into multiple tools each day. The work is pure transcription, and every hop is a chance to introduce drift between systems.',
    priority: 'P0',
    sentiment: 'negative',
  },
  {
    theme: 'Data freshness',
    match: /stale|out of date|outdated|old data|lag|real.?time|refresh|sync/i,
    title: 'Decisions are made against stale data',
    body: 'By the time information reaches the person acting on it, it no longer reflects reality. Users hedge by double-checking the source, which erases the time the tool saved.',
    priority: 'P0',
    sentiment: 'negative',
  },
  {
    theme: 'Trust & accuracy',
    match: /wrong|error|mistake|inaccurate|trust|double.?check|verify|hallucinat|confiden/i,
    title: 'Users will not act on output they cannot verify',
    body: 'Unsourced output gets checked manually before anyone commits to it. Trust is gated on visible evidence, not on accuracy claims.',
    priority: 'P0',
    sentiment: 'negative',
  },
  {
    theme: 'Time cost',
    match: /hours?|minutes?|all morning|takes (me |us )?(too )?long|slow|waste|tedious|days?/i,
    title: 'The workflow consumes a meaningful share of the working day',
    body: 'Users describe the task in units of hours, not clicks. That framing makes time saved the metric this product is judged on.',
    priority: 'P1',
    sentiment: 'negative',
  },
  {
    theme: 'Handoffs',
    match: /hand.?off|escalat|approv|sign.?off|waiting on|blocked by|chase|follow.?up/i,
    title: 'Work stalls at handoffs between roles',
    body: 'Progress pauses whenever an item crosses a team boundary. The delay is queueing and chasing, not the work itself.',
    priority: 'P1',
    sentiment: 'negative',
  },
  {
    theme: 'Reporting',
    match: /report|dashboard|summar(y|ise|ize)|status update|exec|stakeholder|weekly/i,
    title: 'Recurring reports are assembled by hand each cycle',
    body: 'Users rebuild the same summary on a fixed cadence, pulling from several places. The structure is stable; only the numbers change.',
    priority: 'P1',
    sentiment: 'neutral',
  },
  {
    theme: 'Onboarding',
    match: /onboard|ramp|new hire|training|learn|documentation|confus|hard to use/i,
    title: 'The process is held in people, not in the system',
    body: 'New joiners learn the workflow by shadowing rather than from the tool. Institutional knowledge stays informal and leaves when people do.',
    priority: 'P2',
    sentiment: 'neutral',
  },
  {
    theme: 'Integrations',
    match: /integrat|api|export|import|csv|connect|salesforce|jira|slack|sheets?|erp/i,
    title: 'Adoption depends on fitting the existing tool stack',
    body: 'Users expect the product to meet their current systems rather than replace them. A missing connector reads as a missing product.',
    priority: 'P1',
    sentiment: 'neutral',
  },
  {
    theme: 'Willingness to pay',
    match: /pay|price|pricing|budget|cost|worth it|expensive|licen[cs]e|per seat/i,
    title: 'Budget exists once the time saving is demonstrated',
    body: 'Buyers tie spend to a measured reduction in effort. The proof, not the pitch, unlocks the budget line.',
    priority: 'P2',
    sentiment: 'positive',
  },
  {
    theme: 'Enthusiasm',
    match: /love|great|amazing|finally|exactly what|game.?changer|huge|excited|impress/i,
    title: 'Strong pull for an automated first draft',
    body: 'Users respond well to the idea of starting from a generated draft rather than a blank page, provided they keep the final edit.',
    priority: 'P2',
    sentiment: 'positive',
  },
];

const NEG = /\b(hate|frustrat|annoy|painful|awful|terrible|broken|useless|nightmare|struggl|worst|difficult|impossible|can'?t)\b/i;
const POS = /\b(love|great|helpful|easy|smooth|fast|delight|excellent|perfect|nice|good)\b/i;

/** Pull the most quotable line mentioning the theme, if there is one. */
function findQuote(sessions, re) {
  for (const s of sessions) {
    for (const line of s.split(/(?<=[.!?])\s+|\n/)) {
      const clean = line.replace(/^["'“”\s]+|["'“”\s]+$/g, '').trim();
      if (clean.length > 30 && clean.length < 190 && re.test(clean)) return clean;
    }
  }
  return null;
}

/** Score only the sentences that mention the theme — a positive aside elsewhere
 *  in the same session must not flip a pain point to positive. */
function detectSentiment(fallback, sessions, re) {
  const hits = sessions
    .flatMap((s) => s.split(/(?<=[.!?])\s+|\n/))
    .filter((line) => re.test(line))
    .join(' ');
  const neg = NEG.test(hits);
  const pos = POS.test(hits);
  if (neg && !pos) return 'negative';
  if (pos && !neg) return 'positive';
  return fallback;                                 // mixed or silent → theme default
}

function analyse(text) {
  const sessions = splitSessions(text);
  const corpus = sessions.join('\n');
  const found = [];

  for (const t of THEMES) {
    const mentions = sessions.filter((s) => t.match.test(s)).length;
    if (!mentions) continue;
    found.push({
      ...t,
      mentions,
      coverage: sessions.length ? Math.round((mentions / sessions.length) * 100) : 0,
      sentiment: detectSentiment(t.sentiment, sessions, t.match),
      quote: findQuote(sessions, t.match),
    });
  }

  // Nothing matched: still return something honest rather than an empty column.
  if (!found.length && corpus.trim()) {
    found.push({
      theme: 'Unclassified',
      title: 'No recurring theme met the confidence threshold',
      body: 'The transcripts did not contain enough repeated signal to cluster. Add more sessions, or review the raw text manually before drafting requirements.',
      priority: 'P2',
      sentiment: 'neutral',
      mentions: sessions.length,
      coverage: 100,
      quote: null,
    });
  }

  const rank = { P0: 0, P1: 1, P2: 2 };
  found.sort((a, b) => rank[a.priority] - rank[b.priority] || b.mentions - a.mentions);

  return { sessions, insights: found.slice(0, 9) };
}

/* ------------------------------------------------------------------ *
 * Rendering — insights
 * ------------------------------------------------------------------ */

const SENT_LABEL = { positive: 'Positive', neutral: 'Neutral', negative: 'Negative' };

function insightCard(x, i) {
  const quote = x.quote
    ? `<div class="quote">“${escapeHtml(x.quote)}”</div>`
    : '';

  return `
    <article class="card" style="animation-delay:${i * 55}ms">
      <div class="card-top">
        <span class="tag tag-${x.priority.toLowerCase()}">${x.priority}</span>
        <span class="tag tag-sent sent-${x.sentiment}">
          <span class="dot" aria-hidden="true"></span>${SENT_LABEL[x.sentiment]}
        </span>
        <span class="card-theme">${escapeHtml(x.theme)}</span>
      </div>
      <h3>${escapeHtml(x.title)}</h3>
      <p>${escapeHtml(x.body)}</p>
      ${quote}
      <div class="card-foot">
        <span>${x.mentions} of ${x.total} session${x.total === 1 ? '' : 's'}</span>
        <div class="spacer"></div>
        <span>${x.coverage}% coverage</span>
        <span class="bar" aria-hidden="true"><span style="width:${x.coverage}%"></span></span>
      </div>
    </article>`;
}

function renderInsights(list, total) {
  el.insights.innerHTML = list.map((x, i) => insightCard({ ...x, total }, i)).join('');
  el.insightCount.textContent = String(list.length);
  el.insightCount.hidden = false;
}

function renderInsightSkeleton(n = 3) {
  el.insights.innerHTML = Array.from({ length: n }, () => `
    <div class="skel-card">
      <div class="skel-row">
        <span class="skel" style="width:34px;height:16px"></span>
        <span class="skel" style="width:68px;height:16px"></span>
      </div>
      <div class="skel" style="width:82%;height:13px;margin-bottom:8px"></div>
      <div class="skel" style="width:100%;height:10px;margin-bottom:5px"></div>
      <div class="skel" style="width:64%;height:10px"></div>
    </div>`).join('');
}

/* ------------------------------------------------------------------ *
 * Rendering — PRD markdown
 * ------------------------------------------------------------------ */

function buildPrd({ insights, sessions }) {
  const must   = insights.filter((x) => x.priority === 'P0');
  const should = insights.filter((x) => x.priority === 'P1');
  const could  = insights.filter((x) => x.priority === 'P2');
  const painCount = insights.filter((x) => x.sentiment === 'negative').length;
  const today = new Date().toISOString().slice(0, 10);

  const req = (x, i, level) =>
    `| ${i + 1} | ${x.title} | ${level} | Instrumented against the \`${x.theme}\` theme; verified with ${x.mentions} of ${sessions.length} source sessions |`;

  const rows = [
    ...must.map((x, i) => req(x, i, 'Must')),
    ...should.map((x, i) => req(x, must.length + i, 'Should')),
    ...could.map((x, i) => req(x, must.length + should.length + i, 'Could')),
  ].join('\n');

  const headline = must[0] || insights[0];

  return `# Draft PRD · ${headline ? headline.theme : 'Untitled'}

*Generated by Juno from ${sessions.length} transcript session${sessions.length === 1 ? '' : 's'} · ${today} · **draft, not reviewed***

## Problem

${headline ? headline.body : 'No dominant problem emerged from the supplied transcripts.'}

${painCount} of ${insights.length} themes carry negative sentiment, which sets the bar: this is a pain-relief product before it is a delight product.

## Who has it

Practitioners who own a recurring, multi-system workflow and are measured on its throughput — the people quoted in the source sessions, not their managers.

## Solution overview

Juno ingests the raw material these users already produce, clusters it into structured insights with an explicit priority and sentiment, and drafts the downstream document so the human starts from an edit rather than a blank page.

## Requirements

| # | Requirement | Priority | Acceptance criteria |
|---|---|---|---|
${rows || '| — | _No requirements derived_ | — | — |'}

## Success metrics

- **Time to first usable draft** — under 5 minutes from paste to reviewed output.
- **Edit distance** — under 30% of the generated draft is rewritten before it ships.
- **Evidence rate** — 100% of insights link back to a quoted source line.

## Open questions

${insights.slice(0, 3).map((x) => `- Is *${x.theme.toLowerCase()}* a ${x.priority} for every segment, or only for the ${x.mentions} session${x.mentions === 1 ? '' : 's'} that raised it?`).join('\n')}
- What is the minimum session count before clustering is trustworthy?

## Out of scope

Writing the final document. Juno drafts; the PM owns what ships.`;
}

/** Small markdown renderer — enough for the PRD shapes Juno emits. */
function renderMarkdown(md) {
  const inline = (s) => escapeHtml(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');

  const out = [];
  const lines = md.split('\n');
  let list = null;

  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // table block
    if (/^\s*\|/.test(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) {
      closeList();
      const cells = (row) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(line);
      const body = [];
      i += 2;
      while (i < lines.length && /^\s*\|/.test(lines[i])) body.push(cells(lines[i++]));
      i--;
      out.push('<div class="md-scroll"><table><thead><tr>' +
        head.map((h) => `<th>${inline(h)}</th>`).join('') +
        '</tr></thead><tbody>' +
        body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('') +
        '</tbody></table></div>');
      continue;
    }

    if (/^\s*$/.test(line))      { closeList(); continue; }
    if (/^---+\s*$/.test(line))  { closeList(); out.push('<hr />'); continue; }

    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) { closeList(); const n = h[1].length; out.push(`<h${n}>${inline(h[2])}</h${n}>`); continue; }

    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    if (ul) {
      if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; }
      out.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }

    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ol) {
      if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; }
      out.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }

    const bq = line.match(/^>\s?(.*)$/);
    if (bq) { closeList(); out.push(`<blockquote>${inline(bq[1])}</blockquote>`); continue; }

    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join('\n');
}

function renderPrdSkeleton() {
  const bar = (w, mt = 8) => `<div class="skel" style="width:${w};height:11px;margin-top:${mt}px"></div>`;
  el.prd.innerHTML = `
    <div class="skel" style="width:56%;height:19px"></div>
    ${bar('34%', 12)}
    <div class="skel" style="width:26%;height:11px;margin-top:26px"></div>
    ${bar('100%', 12)}${bar('96%')}${bar('72%')}
    <div class="skel" style="width:22%;height:11px;margin-top:26px"></div>
    ${bar('100%', 12)}${bar('88%')}${bar('93%')}${bar('61%')}`;
}

/* ------------------------------------------------------------------ *
 * Status + input bookkeeping
 * ------------------------------------------------------------------ */

function setStatus(stateName, text) {
  el.status.dataset.state = stateName;
  el.statusText.textContent = text;
}

function refreshInputMeta() {
  const text = el.input.value;
  const words = wordsIn(text);
  const sessions = splitSessions(text).length;
  el.wordCount.textContent = `${words.toLocaleString()} word${words === 1 ? '' : 's'}`;
  el.sessionCount.textContent = `${sessions} session${sessions === 1 ? '' : 's'} detected`;
  el.processBtn.disabled = state.running || words < 8;
}

function setLoading(on) {
  state.running = on;
  el.processBtn.dataset.loading = String(on);
  el.processBtn.innerHTML = on
    ? '<span class="spinner" aria-hidden="true"></span>Processing'
    : 'Process';
  el.processBtn.setAttribute('aria-busy', String(on));
  el.processBtn.disabled = on;
  el.cancelBtn.hidden = !on;
  el.input.disabled = on;
  el.sampleBtn.disabled = on;
  el.clearBtn.disabled = on;
  el.progress.hidden = !on;
  if (on) el.progress.firstElementChild.style.width = '0%';
  if (!on) refreshInputMeta();
}

/* ------------------------------------------------------------------ *
 * The pipeline
 * ------------------------------------------------------------------ */

const STAGES = [
  { pct: 18,  label: 'Segmenting sessions…',     ms: 480 },
  { pct: 44,  label: 'Clustering themes…',       ms: 700 },
  { pct: 68,  label: 'Scoring priority & sentiment…', ms: 620 },
  { pct: 88,  label: 'Drafting PRD…',            ms: 760 },
  { pct: 100, label: 'Finalising…',              ms: 320 },
];

async function process() {
  if (state.running) return;
  const runId = ++state.run;
  const text = el.input.value;

  setLoading(true);
  setStatus('working', 'Processing…');
  renderInsightSkeleton(3);
  renderPrdSkeleton();
  el.insightCount.hidden = true;
  el.copyBtn.disabled = true;

  for (const stage of STAGES) {
    setStatus('working', stage.label);
    el.progress.firstElementChild.style.width = `${stage.pct}%`;
    await sleep(stage.ms);
    if (runId !== state.run) return;              // cancelled or superseded
  }

  const result = analyse(text);
  state.markdown = buildPrd(result);

  renderInsights(result.insights, result.sessions.length);
  el.prd.innerHTML = renderMarkdown(state.markdown);
  el.prd.scrollTop = 0;
  el.copyBtn.disabled = false;

  setLoading(false);
  setStatus('done', `${result.insights.length} insight${result.insights.length === 1 ? '' : 's'} · draft ready`);
}

function cancel() {
  state.run++;                                     // invalidates the in-flight run
  setLoading(false);
  setStatus('ready', 'Cancelled');
  resetOutputs();
}

function resetOutputs() {
  state.markdown = '';
  el.insightCount.hidden = true;
  el.copyBtn.disabled = true;
  el.insights.innerHTML = `
    <div class="empty">
      <span class="glyph" aria-hidden="true">◇</span>
      <strong>No insights yet</strong>
      <span>Structured findings — priority, sentiment, and evidence — appear here after processing.</span>
    </div>`;
  el.prd.innerHTML = `
    <div class="empty">
      <span class="glyph" aria-hidden="true">▤</span>
      <strong>No draft yet</strong>
      <span>Juno drafts a PRD from the accepted insights — problem, requirements, and open questions.</span>
    </div>`;
}

/* ------------------------------------------------------------------ *
 * Sample data
 * ------------------------------------------------------------------ */

const SAMPLE = `[P1 · Ops lead, mid-market 3PL · 12 Aug]
I re-key the same order into three systems every morning. By the time I'm done, half of it is already stale and the warehouse has moved on without me. It takes the better part of two hours before I've done anything useful.

[P2 · Customer success manager · 13 Aug]
Every Monday I rebuild the same status report by hand — pull the tickets, pull the usage numbers, paste it into the deck. Nothing changes except the numbers. It's tedious, and I'm the bottleneck when I'm on leave.

[P3 · Head of Product · 13 Aug]
The summaries look great, honestly. But I won't put anything in front of an exec unless I can see where the line came from. If I have to double-check every claim, I've saved nothing. Show me the quote.

[P4 · Support lead · 14 Aug]
Escalations sit for a day and a half waiting on approval from a manager who doesn't know the context. We're chasing people in Slack rather than doing the work.

[P5 · RevOps · 15 Aug]
If it doesn't connect to Salesforce and export a clean CSV, it's a non-starter for us. We're not moving off the stack we have.

[P6 · Director of Ops · 15 Aug]
Budget isn't the blocker. Show me it saves my team a day a week and I'll find the money — but I need that measured, not promised.

[P7 · New hire, ops · 16 Aug]
I learned all of this by sitting next to someone for three weeks. None of it is written down anywhere. It was confusing for a long time.`;

/* ------------------------------------------------------------------ *
 * Wiring
 * ------------------------------------------------------------------ */

el.input.addEventListener('input', refreshInputMeta);
el.processBtn.addEventListener('click', process);
el.cancelBtn.addEventListener('click', cancel);

el.sampleBtn.addEventListener('click', () => {
  el.input.value = SAMPLE;
  refreshInputMeta();
  resetOutputs();
  setStatus('ready', 'Sample loaded · ready to process');
  el.input.focus();
});

el.clearBtn.addEventListener('click', () => {
  el.input.value = '';
  refreshInputMeta();
  resetOutputs();
  setStatus('ready', 'Idle · paste transcripts to begin');
  el.input.focus();
});

el.copyBtn.addEventListener('click', async () => {
  if (!state.markdown) return;
  try {
    await navigator.clipboard.writeText(state.markdown);
    el.copyBtn.textContent = 'Copied';
  } catch {
    el.copyBtn.textContent = 'Copy failed';
  }
  setTimeout(() => { el.copyBtn.textContent = 'Copy markdown'; }, 1600);
});

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !el.processBtn.disabled) {
    e.preventDefault();
    process();
  }
});

refreshInputMeta();

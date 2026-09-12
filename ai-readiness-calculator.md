---
layout: default
title: "AI Readiness Calculator for Kenyan Businesses"
seo_title: "AI Readiness Calculator for Kenyan Businesses"
description: "Score your business across AI strategy, people, data, governance, technology and ROI, then get a practical AI adoption plan."
permalink: /ai-readiness-calculator/
---

<link rel="stylesheet" href="{{ '/assets/css/ai-readiness-calculator.css' | relative_url }}">

<main class="ai-readiness-page">
  <section class="ai-hero">
    <div class="ai-hero-copy">
      <p class="ai-eyebrow">Free Kenya business tool</p>
      <h1>AI Readiness Calculator for Kenyan Businesses</h1>
      <p class="ai-lead">
        Answer 18 practical questions to see whether your business should build its foundations,
        prepare a pilot, start testing AI, or scale what already works.
      </p>

      <div class="ai-hero-points" aria-label="Calculator features">
        <span>18 questions</span>
        <span>6 readiness areas</span>
        <span>About 3 minutes</span>
        
      </div>
    </div>
  </section>

  <section class="ai-calculator" aria-labelledby="calculator-heading">
    <div class="ai-progress-wrap" aria-live="polite">
      <div class="ai-progress-meta">
        <div>
          <strong id="ai-progress-text">0 of 18 answered</strong>
          <span id="ai-progress-category">Start with Strategy</span>
        </div>
        <span id="ai-progress-percent">0%</span>
      </div>
      <div class="ai-progress-track" aria-hidden="true">
        <div id="ai-progress-bar" class="ai-progress-bar"></div>
      </div>
    </div>

    <form id="ai-readiness-form" novalidate>
      <div class="ai-form-intro">
        <div>
          <p class="ai-kicker">Self-assessment</p>
          <h2 id="calculator-heading">How ready is your business for AI?</h2>
        </div>
        <p class="ai-scale-note">
          Choose the answer that best reflects how your business operates <strong>today</strong>,
          not where you hope to be.
        </p>
      </div>

      <div id="ai-questions"></div>

      <div class="ai-actions">
        <button type="submit" class="ai-btn ai-btn-primary">Calculate my AI readiness</button>
        <button type="button" id="ai-reset" class="ai-btn ai-btn-secondary">Reset answers</button>
      </div>

      <p id="ai-form-error" class="ai-error" role="alert" hidden>
        Please answer all 18 questions before calculating your score.
      </p>
    </form>
  </section>

  <section id="ai-results" class="ai-results" hidden aria-live="polite" tabindex="-1">
    <div class="ai-result-hero">
      <div id="ai-score-ring" class="ai-score-ring" aria-label="AI readiness score">
        <div class="ai-score-ring-inner">
          <span id="ai-score" class="ai-score">0</span>
          <span class="ai-score-total">/100</span>
        </div>
      </div>

      <div class="ai-result-copy">
        <p class="ai-eyebrow">Your AI readiness result</p>
        <div class="ai-level-line">
          <h2 id="ai-level">Foundation stage</h2>
          <span id="ai-level-badge" class="ai-level-badge">Foundation</span>
        </div>
        <p id="ai-summary" class="ai-result-summary"></p>
        <p id="ai-next-stage" class="ai-next-stage"></p>
      </div>
    </div>

    <div id="ai-blocker" class="ai-blocker" hidden>
      <strong>Readiness blocker:</strong>
      <span id="ai-blocker-text"></span>
    </div>

    <div class="ai-readiness-scale" aria-label="AI readiness scale">
      <div class="ai-scale-labels" aria-hidden="true">
        <span>Build</span>
        <span>Foundation</span>
        <span>Prepare</span>
        <span>Pilot</span>
        <span>Scale</span>
      </div>
      <div class="ai-scale-track">
        <span class="ai-scale-segment ai-scale-build"></span>
        <span class="ai-scale-segment ai-scale-foundation"></span>
        <span class="ai-scale-segment ai-scale-prepare"></span>
        <span class="ai-scale-segment ai-scale-pilot"></span>
        <span class="ai-scale-segment ai-scale-scale"></span>
        <span id="ai-scale-marker" class="ai-scale-marker" aria-hidden="true"></span>
      </div>
    </div>

    <div class="ai-snapshot-grid">
      <article class="ai-snapshot-card">
        <p>Strongest area</p>
        <strong id="ai-strongest-name">Technology</strong>
        <span id="ai-strongest-score">0%</span>
      </article>

      <article class="ai-snapshot-card ai-snapshot-priority">
        <p id="ai-priority-label">Top priority</p>
        <strong id="ai-priority-name">Governance</strong>
        <span id="ai-priority-score">0%</span>
      </article>

      <article class="ai-snapshot-card">
        <p>Recommended move</p>
        <strong id="ai-recommended-move">Prepare one pilot</strong>
        <span id="ai-recommended-time">Next 30–90 days</span>
      </article>
    </div>

    <div class="ai-result-section">
      <div class="ai-section-title">
        <div>
          <p class="ai-kicker">Readiness profile</p>
          <h2>Your six category scores</h2>
        </div>
        <p>These scores show where your AI foundations are strongest and where gaps could slow adoption.</p>
      </div>
      <div id="ai-category-scores" class="ai-category-scores"></div>
    </div>

    <div class="ai-result-section ai-action-plan-section">
      <div class="ai-section-title">
        <div>
          <p class="ai-kicker">Personalised action plan</p>
          <h2>What to do next</h2>
        </div>
        <p>Your plan prioritises readiness blockers first, then your weakest scoring areas.</p>
      </div>
      <div id="ai-action-plan" class="ai-action-plan"></div>
    </div>

    <div class="ai-result-actions">
      <button type="button" id="ai-print" class="ai-btn ai-btn-primary">Print / Save result as PDF</button>
      <button type="button" id="ai-retake" class="ai-btn ai-btn-secondary">Retake assessment</button>
    </div>

    <p class="ai-disclaimer">
      This is an educational self-assessment and practical diagnostic, not an independently validated benchmark,
      legal advice, cybersecurity advice or professional advice. Businesses handling personal data should separately
      review their obligations under Kenya's Data Protection Act and any regulations that apply to them.
    </p>
  </section>

  <section class="ai-about">
    <div class="ai-section-title">
      <div>
        <p class="ai-kicker">The framework</p>
        <h2>What the calculator measures</h2>
      </div>
      <p>
        A business needs more than access to ChatGPT or another AI tool. Useful adoption depends on six connected foundations.
      </p>
    </div>

    <div class="ai-about-grid">
      <article><span class="ai-card-number">01</span><h3>Strategy</h3><p>Clear business problems, priorities and ownership for AI projects.</p></article>
      <article><span class="ai-card-number">02</span><h3>People</h3><p>Skills, confidence and time for staff to use AI effectively.</p></article>
      <article><span class="ai-card-number">03</span><h3>Data</h3><p>Usable information, good data quality and clear data boundaries.</p></article>
      <article><span class="ai-card-number">04</span><h3>Governance</h3><p>Privacy, security, human review and rules for responsible AI use.</p></article>
      <article><span class="ai-card-number">05</span><h3>Technology</h3><p>Digital systems, reliable access and the ability to run safe pilots.</p></article>
      <article><span class="ai-card-number">06</span><h3>ROI</h3><p>Baselines and metrics for proving time saved, costs reduced or revenue gained.</p></article>
    </div>

    <details class="ai-methodology">
      <summary>How the score is calculated</summary>
      <div>
        <p>
          Each answer scores from 0 to 4. Questions are weighted within their category, and the six categories are then
          combined into a 0–100 overall score. Governance, strategy and data carry slightly more weight because weak controls
          in those areas can undermine otherwise strong technology adoption.
        </p>
        <p>
          Readiness levels are not awarded from the average alone. Higher levels also require minimum scores in key categories,
          and a critical safety or governance gap can prevent a business from being labelled pilot-ready even when its overall score
          is relatively high. For example, strong technology cannot compensate for weak data handling or governance foundations.
        </p>
      </div>
    </details>
  </section>
</main>

<script src="{{ '/assets/js/ai-readiness-calculator.js' | relative_url }}" defer></script>

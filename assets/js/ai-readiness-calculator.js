(() => {
  "use strict";

  const categoryMeta = {
    Strategy: {
      weight: 18,
      description: "Business problems, priorities and ownership",
      action: "Choose one measurable business problem for your first AI use case and assign an owner to it.",
      move: "Define one high-value AI use case"
    },
    People: {
      weight: 15,
      description: "Skills, confidence and capacity",
      action: "Train the people who will actually use AI on prompting, verification, privacy and role-specific workflows.",
      move: "Build practical staff AI skills"
    },
    Data: {
      weight: 17,
      description: "Data quality, access and boundaries",
      action: "Organise the data needed for your first use case, remove obvious quality problems and decide what must remain restricted.",
      move: "Prepare safe, usable business data"
    },
    Governance: {
      weight: 20,
      description: "Privacy, security and human oversight",
      action: "Write a simple AI-use policy covering approved tools, confidential information, personal data and human review.",
      move: "Put AI usage rules in place"
    },
    Technology: {
      weight: 15,
      description: "Systems, access and pilot capability",
      action: "Start with an AI tool that works with your existing systems and can be tested without disrupting critical operations.",
      move: "Run a low-risk technical pilot"
    },
    ROI: {
      weight: 15,
      description: "Baselines, measurement and value",
      action: "Record a baseline before the pilot, such as hours spent, response time, error rate, operating cost or sales conversion.",
      move: "Set a measurable ROI baseline"
    }
  };

  const questions = [
    {
      category: "Strategy",
      weight: 1.3,
      text: "We have identified specific business problems where AI could save time, reduce costs or increase revenue."
    },
    {
      category: "Strategy",
      weight: 1,
      text: "AI projects would support our existing business goals rather than being used simply because AI is popular."
    },
    {
      category: "Strategy",
      weight: 1.1,
      text: "A manager or business owner is clearly responsible for deciding which AI projects to test and scale."
    },

    {
      category: "People",
      weight: 1.2,
      text: "Employees who would use AI have basic skills in prompting, reviewing outputs and checking accuracy."
    },
    {
      category: "People",
      weight: 1,
      text: "Staff are willing to test new digital tools and suggest ways AI could improve their work."
    },
    {
      category: "People",
      weight: 1,
      text: "We have time or budget available for AI training where important skills are missing."
    },

    {
      category: "Data",
      weight: 1,
      text: "Important business information is stored digitally and can be accessed without searching through scattered files or paper records."
    },
    {
      category: "Data",
      weight: 1.2,
      text: "Our customer, sales, finance or operations data is reasonably accurate and up to date."
    },
    {
      category: "Data",
      weight: 1.4,
      critical: true,
      criticalMessage: "The business is not yet clear about which data is safe to use with AI.",
      text: "We know which business data could safely be used with AI and which data should remain restricted."
    },

    {
      category: "Governance",
      weight: 1.5,
      critical: true,
      criticalMessage: "There are weak or missing rules for entering confidential or personal information into public AI tools.",
      text: "We have clear rules on whether employees may enter customer, employee or confidential business information into public AI tools."
    },
    {
      category: "Governance",
      weight: 1.3,
      critical: true,
      criticalMessage: "Important AI-generated work may be used without enough human review.",
      text: "We review AI-generated work before it is used for important decisions, customer communication or published content."
    },
    {
      category: "Governance",
      weight: 1.4,
      critical: true,
      criticalMessage: "Basic cybersecurity, access control or privacy practices need strengthening before wider AI adoption.",
      text: "Our business has basic cybersecurity, access control and privacy practices appropriate to the data we handle."
    },

    {
      category: "Technology",
      weight: 1,
      text: "Our core business systems are digital enough to connect with AI tools, exports, APIs or automation if needed."
    },
    {
      category: "Technology",
      weight: 1.2,
      text: "We can test a new AI tool without disrupting critical operations or committing to a large long-term cost."
    },
    {
      category: "Technology",
      weight: 1,
      text: "We have a reliable internet connection, suitable devices and the software access needed for regular AI use."
    },

    {
      category: "ROI",
      weight: 1.2,
      text: "Before buying a new AI tool, we can estimate the staff time, operating cost or sales opportunity it should improve."
    },
    {
      category: "ROI",
      weight: 1.4,
      text: "We track enough business metrics to compare results before and after introducing a new tool."
    },
    {
      category: "ROI",
      weight: 1,
      text: "We are prepared to stop paying for an AI tool if it does not produce measurable value."
    }
  ];

  const choices = [
    { value: 0, label: "Not yet", hint: "Not in place" },
    { value: 1, label: "Starting", hint: "Very limited" },
    { value: 2, label: "Partly", hint: "Some of the time" },
    { value: 3, label: "Mostly", hint: "Usually in place" },
    { value: 4, label: "Fully", hint: "Consistently in place" }
  ];

  const levelMeta = {
    build: {
      name: "Build the foundations",
      badge: "Build",
      summary: "Your business should strengthen its core digital, data and governance foundations before investing heavily in AI.",
      next: "Aim first for a stable foundation: digitise key information, set basic AI rules and identify one real business problem.",
      move: "Strengthen the foundations",
      time: "Start now"
    },
    foundation: {
      name: "Foundation stage",
      badge: "Foundation",
      summary: "Some important building blocks are in place, but gaps could make an AI project unreliable, difficult to measure or unnecessarily risky.",
      next: "Close the weakest gaps first, then choose one small use case that can be tested safely.",
      move: "Close key readiness gaps",
      time: "Next 30–60 days"
    },
    prepare: {
      name: "Pilot preparation",
      badge: "Prepare",
      summary: "You are close to running a useful AI pilot, but one or more foundations still need attention before broader adoption.",
      next: "Fix the highlighted blockers, define a measurable pilot and establish a baseline before you begin.",
      move: "Prepare one focused pilot",
      time: "Next 30–60 days"
    },
    pilot: {
      name: "Pilot ready",
      badge: "Pilot",
      summary: "Your business has enough of the right foundations to test AI in a focused, low-risk use case and learn from real results.",
      next: "Run a 30–90 day pilot, compare the results with your baseline and scale only if the business value is clear.",
      move: "Run a measured AI pilot",
      time: "Next 30–90 days"
    },
    scale: {
      name: "Scale ready",
      badge: "Scale",
      summary: "Your business has strong foundations for expanding proven AI use cases across more teams, processes or customer journeys.",
      next: "Prioritise the highest-value use cases, integrate them carefully and keep monitoring governance, quality and ROI as usage grows.",
      move: "Scale proven AI use cases",
      time: "Next 90 days"
    }
  };

  const categoryOrder = Object.keys(categoryMeta);
  const form = document.getElementById("ai-readiness-form");
  const questionsWrap = document.getElementById("ai-questions");
  const error = document.getElementById("ai-form-error");
  const results = document.getElementById("ai-results");
  const progressText = document.getElementById("ai-progress-text");
  const progressCategory = document.getElementById("ai-progress-category");
  const progressPercent = document.getElementById("ai-progress-percent");
  const progressBar = document.getElementById("ai-progress-bar");

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderQuestions() {
    categoryOrder.forEach((category, categoryIndex) => {
      const group = document.createElement("section");
      group.className = "ai-question-group";
      group.dataset.category = category;

      const categoryQuestions = questions
        .map((question, index) => ({ ...question, index }))
        .filter(question => question.category === category);

      group.innerHTML = `
        <div class="ai-question-group-header">
          <div class="ai-category-index">${String(categoryIndex + 1).padStart(2, "0")}</div>
          <div>
            <p class="ai-kicker">Readiness area ${categoryIndex + 1} of ${categoryOrder.length}</p>
            <h3>${escapeHtml(category)}</h3>
            <p>${escapeHtml(categoryMeta[category].description)}</p>
          </div>
        </div>
        <div class="ai-question-list"></div>
      `;

      const list = group.querySelector(".ai-question-list");

      categoryQuestions.forEach(question => {
        const fieldset = document.createElement("fieldset");
        fieldset.className = "ai-question";
        fieldset.dataset.category = category;

        const legend = document.createElement("legend");
        legend.innerHTML = `
          <span class="ai-question-number">${question.index + 1}</span>
          <span>${escapeHtml(question.text)}</span>
        `;
        fieldset.appendChild(legend);

        const choicesWrap = document.createElement("div");
        choicesWrap.className = "ai-choices";

        choices.forEach(choice => {
          const id = `q${question.index}-${choice.value}`;
          const label = document.createElement("label");
          label.className = "ai-choice";
          label.setAttribute("for", id);
          label.innerHTML = `
            <input type="radio" id="${id}" name="q${question.index}" value="${choice.value}">
            <span class="ai-choice-box">
              <strong>${escapeHtml(choice.label)}</strong>
              <small>${escapeHtml(choice.hint)}</small>
            </span>
          `;
          choicesWrap.appendChild(label);
        });

        fieldset.appendChild(choicesWrap);
        list.appendChild(fieldset);
      });

      questionsWrap.appendChild(group);
    });
  }

  function getAnsweredCount() {
    return questions.filter((_, index) =>
      form.querySelector(`input[name="q${index}"]:checked`)
    ).length;
  }

  function updateProgress() {
    const answered = getAnsweredCount();
    const pct = Math.round((answered / questions.length) * 100);
    const nextQuestionIndex = questions.findIndex((_, index) =>
      !form.querySelector(`input[name="q${index}"]:checked`)
    );

    progressText.textContent = `${answered} of ${questions.length} answered`;
    progressPercent.textContent = `${pct}%`;
    progressBar.style.width = `${pct}%`;

    if (nextQuestionIndex === -1) {
      progressCategory.textContent = "Assessment complete — calculate your score";
    } else {
      progressCategory.textContent = `Next: ${questions[nextQuestionIndex].category}`;
    }
  }

  function collectAnswers() {
    const answers = [];

    for (let index = 0; index < questions.length; index++) {
      const selected = form.querySelector(`input[name="q${index}"]:checked`);
      if (!selected) return null;
      answers.push(Number(selected.value));
    }

    return answers;
  }

  function calculateCategoryScores(answers) {
    const scores = {};

    categoryOrder.forEach(category => {
      let weightedEarned = 0;
      let weightedPossible = 0;

      questions.forEach((question, index) => {
        if (question.category !== category) return;
        const questionWeight = question.weight || 1;
        weightedEarned += (answers[index] / 4) * questionWeight;
        weightedPossible += questionWeight;
      });

      scores[category] = Math.round((weightedEarned / weightedPossible) * 100);
    });

    return scores;
  }

  function calculateOverallScore(categoryScores) {
    let earned = 0;
    let possible = 0;

    categoryOrder.forEach(category => {
      earned += categoryScores[category] * categoryMeta[category].weight;
      possible += 100 * categoryMeta[category].weight;
    });

    return Math.round((earned / possible) * 100);
  }

  function getCriticalIssues(answers) {
    return questions
      .map((question, index) => ({ question, index, value: answers[index] }))
      .filter(item => item.question.critical && item.value <= 1);
  }

  function getReadinessLevel(score, categoryScores, criticalIssues) {
    const governance = categoryScores.Governance;
    const data = categoryScores.Data;
    const strategy = categoryScores.Strategy;
    const roi = categoryScores.ROI;

    if (score < 35) return "build";
    if (score < 55) return "foundation";

    const pilotGatesMet =
      governance >= 55 &&
      data >= 50 &&
      strategy >= 50 &&
      criticalIssues.length === 0;

    const scaleGatesMet =
      governance >= 75 &&
      data >= 70 &&
      strategy >= 65 &&
      roi >= 65 &&
      criticalIssues.length === 0;

    if (score >= 85 && scaleGatesMet) return "scale";
    if (score >= 70 && pilotGatesMet) return "pilot";

    // A strong average cannot override weak foundations. Businesses that
    // miss the Pilot gates stay in preparation rather than being labelled ready.
    return "prepare";
  }

  function getCategoryStatus(score) {
    if (score < 35) return "Needs attention";
    if (score < 55) return "Developing";
    if (score < 70) return "Emerging";
    if (score < 85) return "Strong";
    return "Advanced";
  }

  function getSortedCategories(categoryScores, direction = "asc") {
    return Object.entries(categoryScores).sort((a, b) =>
      direction === "asc" ? a[1] - b[1] : b[1] - a[1]
    );
  }

  function getReadinessBlockers(categoryScores, criticalIssues) {
    const blockers = [];
    const seen = new Set();

    function addBlocker(category, reason) {
      if (seen.has(category)) return;
      blockers.push({
        category,
        score: categoryScores[category],
        reason
      });
      seen.add(category);
    }

    // Safety and responsible-use failures take precedence over raw scores.
    criticalIssues
      .filter(issue => issue.question.category === "Governance")
      .forEach(issue => addBlocker("Governance", issue.question.criticalMessage));

    criticalIssues
      .filter(issue => issue.question.category === "Data")
      .forEach(issue => addBlocker("Data", issue.question.criticalMessage));

    // These category gates determine whether the business can be labelled Pilot ready.
    if (categoryScores.Governance < 55) {
      addBlocker(
        "Governance",
        "Governance needs strengthening before the business should move into wider AI deployment."
      );
    }

    if (categoryScores.Data < 50) {
      addBlocker(
        "Data",
        "Data readiness needs strengthening before the business should rely on AI in a wider set of workflows."
      );
    }

    if (categoryScores.Strategy < 50) {
      addBlocker(
        "Strategy",
        "The business needs a clearer AI use case, success measure and accountable owner before a pilot."
      );
    }

    return blockers;
  }

  function getPrimaryReadinessBlocker(categoryScores, criticalIssues) {
    return getReadinessBlockers(categoryScores, criticalIssues)[0] || null;
  }

  function renderCategoryScores(categoryScores) {
    const wrap = document.getElementById("ai-category-scores");
    wrap.innerHTML = "";

    categoryOrder.forEach(category => {
      const pct = categoryScores[category];
      const row = document.createElement("article");
      row.className = "ai-category-row";
      row.innerHTML = `
        <div class="ai-category-meta">
          <div>
            <strong>${escapeHtml(category)}</strong>
            <span>${escapeHtml(categoryMeta[category].description)}</span>
          </div>
          <div class="ai-category-score-wrap">
            <strong>${pct}%</strong>
            <span>${escapeHtml(getCategoryStatus(pct))}</span>
          </div>
        </div>
        <div class="ai-category-track" aria-label="${escapeHtml(category)} score ${pct} out of 100">
          <div class="ai-category-bar" style="width:${pct}%"></div>
        </div>
      `;
      wrap.appendChild(row);
    });
  }

  function buildActionPlan(categoryScores, criticalIssues, levelKey) {
    const weakest = getSortedCategories(categoryScores, "asc")[0];

    if (levelKey === "scale") {
      return [
        {
          title: "Rank proven AI use cases by business value",
          text: "Prioritise the AI workflows that already save the most time, reduce the most cost or create the strongest revenue opportunity.",
          reason: "Scale readiness is about expanding what works, not adding AI everywhere."
        },
        {
          title: "Set ongoing governance and quality checks",
          text: "Review access, privacy, output quality and human oversight as AI moves into more teams and higher-impact processes.",
          reason: "Controls need to grow with the number and importance of AI use cases."
        },
        {
          title: "Track ROI by use case",
          text: "Measure each scaled workflow separately and retire tools or automations that stop producing enough value.",
          reason: "Strong AI adoption keeps investment tied to measurable business results."
        }
      ];
    }

    if (levelKey === "pilot") {
      return [
        {
          title: "Run one 30–90 day AI pilot",
          text: "Choose a focused workflow with a clear owner, limited downside and a measurable result such as time saved, response speed, cost or conversion.",
          reason: "Your foundations are strong enough to learn from a real pilot."
        },
        {
          title: `Strengthen ${weakest[0]} while you test`,
          text: categoryMeta[weakest[0]].action,
          reason: `${weakest[0]} is your lowest category at ${weakest[1]}%.`
        },
        {
          title: "Compare the pilot with your baseline",
          text: "At the end of the test, compare the result with how the same work performed before AI and document what changed.",
          reason: "Scale only when the improvement is clear enough to justify the cost and risk."
        }
      ];
    }

    const selected = [];
    const seenCategories = new Set();

    getReadinessBlockers(categoryScores, criticalIssues).forEach(blocker => {
      if (selected.length >= 3 || seenCategories.has(blocker.category)) return;
      selected.push({
        title: categoryMeta[blocker.category].move,
        category: blocker.category,
        score: blocker.score,
        text: categoryMeta[blocker.category].action,
        reason: blocker.reason
      });
      seenCategories.add(blocker.category);
    });

    getSortedCategories(categoryScores, "asc").forEach(([category, score]) => {
      if (selected.length >= 3 || seenCategories.has(category)) return;
      selected.push({
        title: categoryMeta[category].move,
        category,
        score,
        text: categoryMeta[category].action,
        reason: `${category} is one of your lowest-scoring readiness areas.`
      });
      seenCategories.add(category);
    });

    return selected.slice(0, 3);
  }

  function renderActionPlan(categoryScores, criticalIssues, levelKey) {
    const wrap = document.getElementById("ai-action-plan");
    wrap.innerHTML = "";

    const plan = buildActionPlan(categoryScores, criticalIssues, levelKey);
    const timing = ["Do now", "Next 30 days", "Next 60–90 days"];

    plan.forEach((item, index) => {
      const card = document.createElement("article");
      card.className = "ai-action-card";
      const scoreContext = item.category
        ? `${item.category}: ${item.score}% · `
        : "";

      card.innerHTML = `
        <div class="ai-action-step">${index + 1}</div>
        <div>
          <p class="ai-action-time">${timing[index]}</p>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.text)}</p>
          <span class="ai-action-reason">${escapeHtml(scoreContext + item.reason)}</span>
        </div>
      `;
      wrap.appendChild(card);
    });
  }

  function renderBlocker(criticalIssues, categoryScores, levelKey) {
    const blocker = document.getElementById("ai-blocker");
    const blockerText = document.getElementById("ai-blocker-text");
    const blockers = getReadinessBlockers(categoryScores, criticalIssues);

    if ((levelKey === "build" || levelKey === "foundation" || levelKey === "prepare") &&
        blockers.length > 0) {
      blockerText.textContent = blockers
        .slice(0, 2)
        .map(item => item.reason)
        .join(" ");
      blocker.hidden = false;
    } else {
      blocker.hidden = true;
      blockerText.textContent = "";
    }
  }

  function renderSnapshot(categoryScores, criticalIssues, levelKey) {
    const sortedDesc = getSortedCategories(categoryScores, "desc");
    const sortedAsc = getSortedCategories(categoryScores, "asc");
    const strongest = sortedDesc[0];
    const weakest = sortedAsc[0];
    const highestScore = strongest[1];
    const lowestScore = weakest[1];
    const spread = highestScore - lowestScore;
    const level = levelMeta[levelKey];
    const priorityCard = document.querySelector(".ai-snapshot-priority");
    const priorityLabel = document.getElementById("ai-priority-label");
    const blocker = getPrimaryReadinessBlocker(categoryScores, criticalIssues);

    if (spread <= 3) {
      document.getElementById("ai-strongest-name").textContent = "Balanced profile";
      document.getElementById("ai-strongest-score").textContent =
        highestScore === lowestScore
          ? `All areas ${highestScore}%`
          : `All areas ${lowestScore}–${highestScore}%`;
    } else {
      document.getElementById("ai-strongest-name").textContent = strongest[0];
      document.getElementById("ai-strongest-score").textContent = `${strongest[1]}%`;
    }

    if (blocker) {
      priorityLabel.textContent = "Readiness blocker";
      document.getElementById("ai-priority-name").textContent = blocker.category;
      document.getElementById("ai-priority-score").textContent =
        `${blocker.score}% · Fix before advancing`;
      priorityCard?.classList.remove("is-positive");
      priorityCard?.classList.add("is-blocker");
    } else if (lowestScore >= 85) {
      priorityLabel.textContent = "Top priority";
      document.getElementById("ai-priority-name").textContent = "No major gap";
      document.getElementById("ai-priority-score").textContent = `Lowest area ${lowestScore}%`;
      priorityCard?.classList.remove("is-blocker");
      priorityCard?.classList.add("is-positive");
    } else if (spread <= 3) {
      priorityLabel.textContent = "Top priority";
      document.getElementById("ai-priority-name").textContent = "Raise all foundations";
      document.getElementById("ai-priority-score").textContent = `Lowest area ${lowestScore}%`;
      priorityCard?.classList.remove("is-positive", "is-blocker");
    } else {
      priorityLabel.textContent = "Top priority";
      document.getElementById("ai-priority-name").textContent = weakest[0];
      document.getElementById("ai-priority-score").textContent = `${weakest[1]}%`;
      priorityCard?.classList.remove("is-positive", "is-blocker");
    }

    document.getElementById("ai-recommended-move").textContent = level.move;
    document.getElementById("ai-recommended-time").textContent = level.time;
  }

  function renderResults(score, categoryScores, criticalIssues, levelKey) {
    const level = levelMeta[levelKey];

    document.getElementById("ai-score").textContent = score;
    document.getElementById("ai-level").textContent = level.name;
    document.getElementById("ai-level-badge").textContent = level.badge;
    document.getElementById("ai-summary").textContent = level.summary;
    document.getElementById("ai-next-stage").textContent = level.next;

    const scoreRing = document.getElementById("ai-score-ring");
    scoreRing.style.setProperty("--ai-score", score);

    results.dataset.level = levelKey;

    const stagePositions = {
      build: 17.5,
      foundation: 45,
      prepare: 62.5,
      pilot: 77.5,
      scale: 92.5
    };
    const scaleMarker = document.getElementById("ai-scale-marker");
    scaleMarker.style.left = `${stagePositions[levelKey]}%`;

    renderBlocker(criticalIssues, categoryScores, levelKey);
    renderSnapshot(categoryScores, criticalIssues, levelKey);
    renderCategoryScores(categoryScores);
    renderActionPlan(categoryScores, criticalIssues, levelKey);

    results.hidden = false;
    results.focus({ preventScroll: true });
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  form.addEventListener("change", event => {
    if (event.target.matches('input[type="radio"]')) {
      const question = event.target.closest(".ai-question");
      question?.classList.add("ai-question-answered");
    }
    error.hidden = true;
    updateProgress();
  });

  form.addEventListener("submit", event => {
    event.preventDefault();

    const answers = collectAnswers();

    if (!answers) {
      error.hidden = false;
      const firstMissingIndex = questions.findIndex((_, index) =>
        !form.querySelector(`input[name="q${index}"]:checked`)
      );
      const firstMissing = form.querySelector(`input[name="q${firstMissingIndex}"]`);
      firstMissing?.focus();
      firstMissing?.closest(".ai-question")?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
      return;
    }

    const categoryScores = calculateCategoryScores(answers);
    const score = calculateOverallScore(categoryScores);
    const criticalIssues = getCriticalIssues(answers);
    const levelKey = getReadinessLevel(score, categoryScores, criticalIssues);

    renderResults(score, categoryScores, criticalIssues, levelKey);
  });

  function resetAssessment(scrollToForm = false) {
    form.reset();
    form.querySelectorAll(".ai-question-answered").forEach(item =>
      item.classList.remove("ai-question-answered")
    );
    error.hidden = true;
    results.hidden = true;
    updateProgress();

    if (scrollToForm) {
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  document.getElementById("ai-reset").addEventListener("click", () => {
    resetAssessment(false);
  });

  document.getElementById("ai-retake").addEventListener("click", () => {
    resetAssessment(true);
  });

  document.getElementById("ai-print").addEventListener("click", () => {
    window.print();
  });

  renderQuestions();
  updateProgress();
})();

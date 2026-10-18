const STORAGE_KEY = "afya_morfofisiologia_ii_modular_v1";

function getStoredData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { answers: {}, graded: {} };
  } catch (e) {
    return { answers: {}, graded: {} };
  }
}

function saveStoredData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {}
}

// Gerenciamento do Modo Claro / Escuro
function initTheme() {
  const themeToggle = document.getElementById("themeToggle");
  const themeIcon = document.getElementById("themeIcon");
  const themeText = document.getElementById("themeText");

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    if (themeIcon && themeText) {
      themeIcon.textContent = theme === "dark" ? "☀️" : "🌙";
      themeText.textContent = theme === "dark" ? "Modo Claro" : "Modo Escuro";
    }
    try {
      localStorage.setItem("afya_theme", theme);
    } catch (e) {}
  }

  const savedTheme = localStorage.getItem("afya_theme") || "light";
  applyTheme(savedTheme);

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }
}

// Atualiza os badges de status no index.html
function initPortalStatus() {
  const statusEls = document.querySelectorAll("[data-quiz-status]");
  if (!statusEls.length) return;

  const store = getStoredData();
  statusEls.forEach(el => {
    const key = el.getAttribute("data-quiz-status");
    const total = parseInt(el.getAttribute("data-total"), 10) || 0;
    const ansObj = (store.answers && store.answers[key]) || {};
    const answeredCount = Object.keys(ansObj).length;
    const isGraded = store.graded && store.graded[key];

    if (isGraded) {
      el.textContent = "✓ Concluída";
      el.classList.add("done");
    } else if (answeredCount > 0) {
      el.textContent = `Em andamento (${answeredCount}/${total})`;
    } else {
      el.textContent = "Não iniciada";
    }
  });
}

// Inicializa uma página de questionário caso window.QUIZ_DATA esteja definido
function initQuizPage() {
  if (!window.QUIZ_DATA) return;

  const quiz = window.QUIZ_DATA;
  const quizKey = quiz.id;
  let currentFilter = "all";

  const questionsContainer = document.getElementById("questionsContainer");
  const activeQuizTitle = document.getElementById("activeQuizTitle");
  const progressText = document.getElementById("progressText");
  const progressFill = document.getElementById("progressFill");
  const resultsPanel = document.getElementById("resultsPanel");
  const filterBar = document.getElementById("filterBar");
  const btnGrade = document.getElementById("btnGrade");
  const btnReset = document.getElementById("btnReset");

  function render() {
    const store = getStoredData();
    const userAnswers = (store.answers && store.answers[quizKey]) || {};
    const isGraded = Boolean(store.graded && store.graded[quizKey]);

    if (activeQuizTitle) activeQuizTitle.textContent = quiz.title;

    // Progresso
    const total = quiz.questions.length;
    const answered = Object.keys(userAnswers).length;
    const pct = total > 0 ? Math.round((answered / total) * 100) : 0;
    if (progressText) progressText.textContent = `${answered} de ${total} respondidas (${pct}%)`;
    if (progressFill) progressFill.style.width = `${pct}%`;

    questionsContainer.innerHTML = "";

    quiz.questions.forEach((q, idx) => {
      const selectedOpt = userAnswers[q.id];
      const isCorrect = selectedOpt === q.answer;
      const isUnanswered = !selectedOpt;

      if (isGraded) {
        if (currentFilter === "correct" && !isCorrect) return;
        if (currentFilter === "wrong" && isCorrect) return;
      }

      const card = document.createElement("article");
      card.className = "question-card";
      if (isGraded) {
        if (isCorrect) card.classList.add("card-correct");
        else if (isUnanswered) card.classList.add("card-unanswered");
        else card.classList.add("card-wrong");
      }

      let badgeHTML = "";
      if (isGraded) {
        if (isCorrect) {
          badgeHTML = `<span class="question-status-badge badge-correct">✓ Acertou</span>`;
        } else if (isUnanswered) {
          badgeHTML = `<span class="question-status-badge badge-unanswered">! Em branco (Gabarito: ${q.answer.toUpperCase()})</span>`;
        } else {
          badgeHTML = `<span class="question-status-badge badge-wrong">✗ Errou (Gabarito: ${q.answer.toUpperCase()})</span>`;
        }
      }

      const optionsHTML = Object.entries(q.options).map(([letter, text]) => {
        const isSelected = selectedOpt === letter;
        let labelClass = "option-label";
        if (isSelected) labelClass += " selected";
        if (isGraded) {
          labelClass += " disabled";
          if (letter === q.answer) labelClass += " opt-correct";
          else if (isSelected && letter !== q.answer) labelClass += " opt-wrong";
        }

        return `
          <label class="${labelClass}">
            <input
              type="radio"
              name="q_${quizKey}_${q.id}"
              value="${letter}"
              ${isSelected ? "checked" : ""}
              ${isGraded ? "disabled" : ""}
            />
            <span class="option-letter">${letter.toUpperCase()})</span>
            <span class="option-text">${text}</span>
          </label>
        `;
      }).join("");

      card.innerHTML = `
        <div class="question-header">
          <span class="question-number">Questão ${idx + 1}</span>
          ${badgeHTML}
        </div>
        <div class="question-stem">${q.stem}</div>
        <div class="options-group">${optionsHTML}</div>
        <div class="explanation-box ${isGraded ? "visible" : ""}">
          <div class="explanation-title">Gabarito Comentado</div>
          <div>${q.explanation}</div>
        </div>
      `;

      if (!isGraded) {
        card.querySelectorAll('input[type="radio"]').forEach(input => {
          input.addEventListener("change", (e) => {
            const currentStore = getStoredData();
            if (!currentStore.answers[quizKey]) currentStore.answers[quizKey] = {};
            currentStore.answers[quizKey][q.id] = e.target.value;
            saveStoredData(currentStore);
            render();
          });
        });
      }

      questionsContainer.appendChild(card);
    });

    if (isGraded) {
      let correct = 0, wrong = 0, unanswered = 0;
      quiz.questions.forEach(q => {
        const ans = userAnswers[q.id];
        if (!ans) unanswered++;
        else if (ans === q.answer) correct++;
        else wrong++;
      });

      const scorePct = total > 0 ? Math.round((correct / total) * 100) : 0;
      document.getElementById("statScore").textContent = `${scorePct}%`;
      document.getElementById("statCorrect").textContent = correct;
      document.getElementById("statWrong").textContent = wrong;
      document.getElementById("statUnanswered").textContent = unanswered;

      const feedbackEl = document.getElementById("resultsFeedback");
      if (scorePct >= 80) {
        feedbackEl.textContent = "Excelente desempenho! Você domina muito bem o conteúdo desta lista.";
      } else if (scorePct >= 60) {
        feedbackEl.textContent = "Bom resultado! Revise os comentários das questões que errou para fixar os detalhes.";
      } else {
        feedbackEl.textContent = "Continue praticando! Leia atentamente o gabarito comentado abaixo de cada questão.";
      }

      resultsPanel.classList.add("visible");
      filterBar.classList.add("visible");
      btnGrade.style.display = "none";
    } else {
      resultsPanel.classList.remove("visible");
      filterBar.classList.remove("visible");
      btnGrade.style.display = "inline-block";
    }
  }

  btnGrade.addEventListener("click", () => {
    const store = getStoredData();
    const userAnswers = (store.answers && store.answers[quizKey]) || {};
    const answeredCount = Object.keys(userAnswers).length;

    if (answeredCount < quiz.questions.length) {
      const rest = quiz.questions.length - answeredCount;
      if (!confirm(`Você deixou ${rest} questão(ões) em branco. Deseja ver o gabarito e avaliar mesmo assim?`)) {
        return;
      }
    }

    if (!store.graded) store.graded = {};
    store.graded[quizKey] = true;
    saveStoredData(store);
    currentFilter = "all";
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("active", b.dataset.filter === "all"));
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  btnReset.addEventListener("click", () => {
    if (!confirm("Deseja limpar suas respostas desta lista e refazer do zero?")) return;
    const store = getStoredData();
    if (store.answers) store.answers[quizKey] = {};
    if (store.graded) store.graded[quizKey] = false;
    saveStoredData(store);
    currentFilter = "all";
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("active", b.dataset.filter === "all"));
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      currentFilter = btn.dataset.filter;
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("active", b.dataset.filter === currentFilter));
      render();
    });
  });

  render();
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initPortalStatus();
  initQuizPage();
});
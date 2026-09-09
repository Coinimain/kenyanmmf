(() => {
  "use strict";

  const input = document.getElementById("blog-search-input");
  const clearButton = document.getElementById("blog-search-clear");
  const list = document.getElementById("blog-post-list");
  const status = document.getElementById("blog-search-status");
  const noResults = document.getElementById("blog-no-results");

  if (!input || !clearButton || !list || !status || !noResults) return;

  const cards = Array.from(list.querySelectorAll(".blog-card"));
  const searchableText = new Map(
    cards.map((card) => [card, normalize(card.dataset.search || card.textContent)])
  );

  function normalize(value) {
    return String(value)
      .toLocaleLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function filterArticles() {
    const query = input.value.trim();
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    const isSearching = terms.length > 0;
    let matches = 0;
    let firstMatch = null;

    for (const card of cards) {
      const matchesQuery = !isSearching || terms.every((term) => searchableText.get(card).includes(term));

      card.hidden = !matchesQuery;
      card.classList.remove("blog-card--search-featured");

      if (matchesQuery) {
        matches += 1;
        firstMatch ||= card;
      }
    }

    list.classList.toggle("blog-list--filtered", isSearching);
    if (isSearching && firstMatch) firstMatch.classList.add("blog-card--search-featured");

    clearButton.hidden = input.value.length === 0;
    status.hidden = !isSearching;
    status.textContent = isSearching
      ? `${matches} ${matches === 1 ? "article" : "articles"} found`
      : "";
    noResults.hidden = !isSearching || matches !== 0;
  }

  input.addEventListener("input", filterArticles);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && input.value) {
      input.value = "";
      filterArticles();
    }
  });

  clearButton.addEventListener("click", () => {
    input.value = "";
    filterArticles();
    input.focus();
  });
})();

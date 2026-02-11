(() => {
  const form = document.getElementById("contactForm");
  if (!form) return;

  const statusEl = document.getElementById("contactStatus");
  const submitBtn = document.getElementById("contactSubmit");

  const setStatus = (msg, ok = true) => {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.dataset.state = ok ? "ok" : "error";
  };

  const showError = (field, msg) => {
    const err = form.querySelector(`.error[data-for="${field.id}"]`);
    if (err) err.textContent = msg || "";
    field.setAttribute("aria-invalid", msg ? "true" : "false");
  };

  const validate = () => {
    let valid = true;

    const name = form.querySelector("#name");
    const email = form.querySelector("#email");
    const topic = form.querySelector("#topic");
    const message = form.querySelector("#message");

    // reset
    [name, email, topic, message].forEach((el) => el && showError(el, ""));

    if (name && name.value.trim().length < 2) {
      showError(name, "Please enter your name (at least 2 characters).");
      valid = false;
    }

    if (email) {
      const v = email.value.trim();
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      if (!ok) {
        showError(email, "Please enter a valid email address.");
        valid = false;
      }
    }

    if (topic && !topic.value) {
      showError(topic, "Please select a topic.");
      valid = false;
    }

    if (message && message.value.trim().length < 10) {
      showError(message, "Please write a message (at least 10 characters).");
      valid = false;
    }

    return valid;
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("");

    if (!validate()) {
      setStatus("Please fix the highlighted fields and try again.", false);
      return;
    }

    submitBtn && (submitBtn.disabled = true);
    setStatus("Sending…");

    try {
      const resp = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });

      if (resp.ok) {
        // Redirect to your thank-you page (works because you're using fetch/AJAX)
        const redirect = form.querySelector('input[name="_redirect"]')?.value;
        window.location.href = redirect || "/contact-thanks.html";
        return;
      } else {
        setStatus("Sorry — something went wrong. Please try again.", false);
      }
    } catch {
      setStatus("Network error — please try again.", false);
    } finally {
      submitBtn && (submitBtn.disabled = false);
    }
  });
})();

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

/* =========================================================
   🔑 SUPABASE INITIALIZATION (PUBLIC KEYS)
========================================================= */
const SUPABASE_URL = "https://pjrqqrxlzbpjkpxligup.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0cnN1dmVxZWZ0bWdvZWl3amd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzQ0MDYsImV4cCI6MjA3NzI1MDQwNn0.efQI0fEnz_2wyCF-mlb-JnZAHtI-6xhNH8S7tdFLGyo";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* =========================================================
   🧠 MAIN APP LOGIC
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form");
  const emailField = document.getElementById("userEmail");
  const nameField = document.getElementById("userName");
  const jobField = document.getElementById("jobTitle");
  const companyField = document.getElementById("companyName");
  const coverLetter = document.getElementById("coverLetter");
  const payButton = document.getElementById("payButton");
  const resultBox = document.getElementById("resultBox");
  const clearBtn = document.getElementById("clearBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const copyBtn = document.getElementById("copyBtn");
  const toast = document.getElementById("toast");
  const templateButtons = document.querySelectorAll(".template-btn");
  const themeToggle = document.getElementById("themeToggle");

  let isProUser = false;

  /* =========================================================
     🌍 RESTORE USER DATA
  ========================================================= */
  const savedData = JSON.parse(localStorage.getItem("userData") || "{}");
  if (savedData.email) emailField.value = savedData.email;
  if (savedData.name) nameField.value = savedData.name;
  if (savedData.job) jobField.value = savedData.job;
  if (savedData.company) companyField.value = savedData.company;

  /* =========================================================
     ✅ AUTO UNLOCK AFTER STRIPE SUCCESS PAGE
  ========================================================= */
  if (localStorage.getItem("hasPaid") === "true") {
    isProUser = true;
    updateLockState();
    showToast("✅ Payment confirmed — templates unlocked!", "success");
    localStorage.removeItem("hasPaid"); // prevent re-trigger
  }

  /* =========================================================
     💳 STRIPE RETURN HANDLER (CHECK SUPABASE)
  ========================================================= */
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("session_id")) {
    const userEmail = savedData.email;
    if (userEmail) {
      checkPayment(userEmail).then((paid) => {
        if (paid) {
          isProUser = true;
          updateLockState();
          showToast("✅ Payment verified — templates unlocked!", "success");
        } else {
          showToast("⚠️ Payment not verified yet. Try refreshing.", "error");
        }
      });
    }
  }

  /* =========================================================
     💾 CHECK PAYMENT IN SUPABASE
  ========================================================= */
  async function checkPayment(email) {
    if (!supabase || !email) return false;
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("id")
        .eq("email", email)
        .eq("payment_status", "paid")
        .maybeSingle();
      if (error) throw error;
      return !!data;
    } catch (err) {
      console.error("Supabase error:", err.message);
      return false;
    }
  }

  /* =========================================================
     🔒 LOCK / UNLOCK LOGIC
  ========================================================= */
  function updateLockState() {
    templateButtons.forEach((btn) => {
      const lock = btn.querySelector(".lock-icon");
      if (!isProUser) {
        btn.disabled = true;
        payButton.classList.remove("hidden");
        if (!lock) {
          const icon = document.createElement("span");
          icon.classList.add("lock-icon");
          icon.textContent = " 🔒";
          btn.appendChild(icon);
        }
      } else {
        btn.disabled = false;
        payButton.classList.add("hidden");
        if (lock) lock.remove();
      }
    });
  }
  updateLockState();

  /* =========================================================
     💳 STRIPE PAYMENT HANDLER
  ========================================================= */
  if (payButton) {
    payButton.addEventListener("click", async () => {
      const userData = {
        name: nameField.value.trim(),
        job: jobField.value.trim(),
        company: companyField.value.trim(),
        email: emailField.value.trim(),
      };

      if (!userData.email || !userData.email.includes("@")) {
        showToast("⚠️ Please enter your email before paying.", "error");
        return;
      }

      // Save user data before redirect
      localStorage.setItem("userData", JSON.stringify(userData));

      try {
        const res = await fetch("https://quickcoverletter-backend.onrender.com/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userData.email }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          showToast("❌ Could not start payment.", "error");
        }
      } catch (err) {
        console.error("Stripe error:", err);
        showToast("⚠️ Payment setup failed.", "error");
      }
    });
  }

  /* =========================================================
     ✉️ LETTER TEMPLATES
  ========================================================= */
  const templates = {
    professional: (n, j, c, d) => `${n}
[Your Address]
[City, County]
${d}

Dear Hiring Manager,

I am writing to apply for the ${j} position at ${c}. With a proven record of reliability and dedication, I am confident I can make a valuable contribution to your team.

Sincerely,
${n}`,

    formal: (n, j, c, d) => `${n}
[Your Address]
[City, County]
${d}

Dear Hiring Manager,

I am writing to formally express my interest in the ${j} position at ${c}. My professionalism, organisation, and consistency align closely with your company’s values.

Yours faithfully,
${n}`,

    friendly: (n, j, c, d) => `${n}
[Your Address]
[City, County]
${d}

Dear Hiring Manager,

I’m excited to apply for the ${j} role at ${c}. I value teamwork, clear communication, and a positive attitude — qualities I’d bring to your team.

Kind regards,
${n}`,

    artistic: (n, j, c, d) => `${n}
[Your Address]
[City, County]
${d}

Dear Hiring Manager,

I’m thrilled to express my interest in the ${j} position at ${c}. My creative yet structured approach helps deliver thoughtful, professional work.

Warm regards,
${n}`,
  };

  /* =========================================================
     🧠 TEMPLATE BUTTON HANDLER
  ========================================================= */
  templateButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!isProUser) return showToast("🔒 Templates are locked. Please pay first.", "error");

      const name = nameField.value.trim();
      const job = jobField.value.trim();
      const company = companyField.value.trim();
      if (!name || !job || !company)
        return showToast("⚠️ Please fill all form fields first.", "error");

      const date = new Date().toLocaleDateString("en-IE", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const type = btn.dataset.type;
      coverLetter.value = templates[type](name, job, company, date);
      resultBox.classList.remove("hidden");
      showToast(`✅ ${type.charAt(0).toUpperCase() + type.slice(1)} letter generated.`, "success");
    });
  });

  /* =========================================================
     📄 PDF + COPY
  ========================================================= */
  const { jsPDF } = window.jspdf;
  function renderExact(pdf, text, x, y, maxWidth, lh = 7) {
    const pageH = pdf.internal.pageSize.getHeight();
    const lines = text.split("\n");
    for (const line of lines) {
      const chunks = pdf.splitTextToSize(line, maxWidth);
      for (const chunk of chunks) {
        if (y > pageH - 20) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(chunk, x, y);
        y += lh;
      }
    }
  }

  downloadBtn.addEventListener("click", () => {
    if (!coverLetter.value.trim()) return;
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    pdf.setFont("times", "normal").setFontSize(12);
    renderExact(pdf, coverLetter.value, 20, 20, 170);
    pdf.save("CoverLetter.pdf");
    showToast("📄 PDF downloaded", "success");
  });

  copyBtn.addEventListener("click", () => {
    if (!coverLetter.value.trim()) return;
    navigator.clipboard
      .writeText(coverLetter.value)
      .then(() => showToast("Copied to clipboard ✅", "success"))
      .catch(() => showToast("❌ Copy failed", "error"));
  });

  /* =========================================================
     🧹 CLEAR BUTTON
  ========================================================= */
  clearBtn.addEventListener("click", () => {
    if (form) form.reset();
    coverLetter.value = "";
    resultBox.classList.add("hidden");
    isProUser = false;
    updateLockState();
    localStorage.removeItem("userData");
    showToast("🧹 Form cleared — templates locked again.", "info");
  });

  /* =========================================================
     🌓 DARK MODE TOGGLE
  ========================================================= */
  if (themeToggle) {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") document.body.classList.add("dark");
    themeToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";

    themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark");
      const isDark = document.body.classList.contains("dark");
      localStorage.setItem("theme", isDark ? "dark" : "light");
      themeToggle.textContent = isDark ? "☀️" : "🌙";
    });
  }

  /* =========================================================
     🔔 TOAST FUNCTION
  ========================================================= */
  function showToast(msg, type = "info", time = 3000) {
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.classList.remove("show"), time);
  }
});

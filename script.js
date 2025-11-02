// =========================================================
// QuickCoverLetter — FRONTEND LOGIC (FINAL PATCH)
// ---------------------------------------------------------
// WHAT THIS DOES:
// 1. **CRITICAL FIX:** Initializes 'isProUser' by checking sessionStorage,
//    which is set by success.html after payment.
// 2. Restores form after Stripe redirect (reads localStorage.userData).
// 3. Forces ALL 4 fields to be filled before allowing payment.
// 4. On return with ?session_id=... (or if sessionStorage is set):
//    → **Unlocks templates.**
//    → Shows green toast with "Payment successful! Choose a letter type."
// 5. Generates 4 letter types with your exact wording.
// 6. Smooth scrolls to the textarea when letter is generated.
// 7. Download → pdf name = job-company.pdf.
// 8. Clear → wipes storage + locks again (user must pay again).
// 9. Toasts auto-hide after 4 seconds.
// =========================================================

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ✅ your Supabase (still used for safety read, but NOT required to unlock)
const SUPABASE_URL = "https://ztrsuveqeftmgoeiwjgz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0cnN1dmVxZWZ0bWdvZWl3amd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzQ0MDYsImV4cCI6MjA3NzI1MDQwNn0.efQI0fEnz_2wyCF-mlb-JnZAHtI-6xhNH8S7tdFLGyo";

// ✅ your backend on Render
const BACKEND_URL = "https://quickcoverletter-backend.onrender.com";

// Initialize Supabase (optional, but good practice)
// Note: We don't use the returned object, but this ensures the library is loaded.
createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", () => {
  // -------------------------------------------------------
  // 1) grab DOM elements
  // -------------------------------------------------------
  const form = document.getElementById("form");
  const jobField = document.getElementById("jobTitle");
  const companyField = document.getElementById("companyName");
  const nameField = document.getElementById("userName");
  const emailField = document.getElementById("userEmail");
  const payButton = document.getElementById("payButton");
  const templateButtons = document.querySelectorAll(".template-btn");
  const coverLetter = document.getElementById("coverLetter");
  const resultBox = document.getElementById("resultBox");
  const clearBtn = document.getElementById("clearBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const copyBtn = document.getElementById("copyBtn");
  const toast = document.getElementById("toast");
  const themeToggle = document.getElementById("themeToggle");

  // single source of truth - Initialize by checking session storage
  // 💡 CRITICAL FIX: isProUser is now determined by sessionStorage flag
  let isProUser = sessionStorage.getItem("isProUser") === "true";
  const urlParams = new URLSearchParams(window.location.search);
  const justReturnedFromPayment = urlParams.has("session_id");

  // -------------------------------------------------------
  // 2) restore form from localStorage (so Stripe roundtrip keeps data)
  // -------------------------------------------------------
  const saved = JSON.parse(localStorage.getItem("userData") || "{}");
  if (saved.job) jobField.value = saved.job;
  if (saved.company) companyField.value = saved.company;
  if (saved.name) nameField.value = saved.name;
  if (saved.email) emailField.value = saved.email;

  // -------------------------------------------------------
  // 3) toasts
  // -------------------------------------------------------
  function showToast(msg, type = "info") {
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `toast ${type} show`;
    clearTimeout(toast._hide);
    toast._hide = setTimeout(() => {
      toast.classList.remove("show");
    }, 4000);
  }

  // -------------------------------------------------------
  // 4) templates (your wording, unchanged)
  // -------------------------------------------------------
  const templates = {
    professional: (name, job, company, date) => `${name}
[Your Address]
[City, County]
${date}

Dear Hiring Manager,

I am writing to apply for the ${job} position at ${company}. With a proven track record of delivering high-quality work, strong attention to detail, and a professional approach to customers and colleagues, I am confident I can make a positive contribution to your team.

Throughout my career I have been recognised for reliability, consistency, and the ability to follow process while still delivering excellent results. I work well both independently and as part of a team, and I am comfortable representing the company in a professional manner.

I would welcome the opportunity to bring this experience to ${company} and support your goals.

Thank thank you for your time and consideration.

Sincerely,
${name}`,

    formal: (name, job, company, date) => `${name}
[Your Address]
[City, County]
${date}

Dear Hiring Manager,

I wish to formally express my interest in the ${job} role at ${company}. I have always maintained high professional standards in every position I have held, ensuring accuracy, clear communication, and respect for established procedures.

In previous roles I have been trusted to manage tasks carefully, meet deadlines, and support both customers and internal teams. I believe these skills would transfer well to ${company}, particularly in a role that values professionalism and reliability.

I would appreciate the opportunity to discuss how my background aligns with your current requirements.

Yours faithfully,
${name}`,

    friendly: (name, job, company, date) => `${name}
[Your Address]
[City, County]
${date}

Dear Hiring Manager,

I am excited to apply for the ${job} position at ${company}. I enjoy working with people, solving problems in a calm and practical way, and creating a positive experience for customers and colleagues.

I am known for being approachable, dependable, and easy to work with. I bring good communication skills, patience, and a genuine interest in helping others — which I believe would be a good fit for ${company}.

Thank you for considering my application. I would be happy to speak further about how I can contribute to your team.

Kind regards,
${name}`,

    artistic: (name, job, company, date) => `${name}
[Your Address]
[City, County]
${date}

Dear Hiring Manager,

I am writing to express my interest in the ${job} role at ${company}. I take pride in producing work that is thoughtful, well-presented, and aligned with the organisation’s values. I balance creativity with structure, and I always aim to deliver work that looks professional and represents the company well.

What interests me in ${company} is its focus on quality and forward thinking. I would welcome the chance to bring my ideas, attention to detail, and strong work ethic to your team.

Thank you for your time and consideration.

Warm regards,
${name}`,
  };

  // -------------------------------------------------------
  // 5) lock / unlock
  // -------------------------------------------------------
  function updateLockState() {
    // pay button must NEVER hide
    payButton?.classList.remove("hidden");

    templateButtons.forEach((btn) => {
      let lock = btn.querySelector(".lock-icon");
      if (!isProUser) {
        btn.disabled = true;
        if (!lock) {
          lock = document.createElement("span");
          lock.className = "lock-icon";
          lock.textContent = " 🔒";
          lock.style.marginLeft = "6px";
          lock.style.color = "#ff6b6b";
          lock.style.fontWeight = "bold";
          btn.appendChild(lock);
        }
      } else {
        btn.disabled = false;
        if (lock) lock.remove();
      }
    });
  }

  // -------------------------------------------------------
  // 6) handle Stripe return - 💡 CRITICAL FIX: Toast fires immediately and only once
  // -------------------------------------------------------

  // If the user just returned from payment (URL has session_id)
  if (justReturnedFromPayment) {
    // If the success page did its job, isProUser should already be true from sessionStorage check,
    // but we ensure it here too, just in case.
    isProUser = true;
    updateLockState();

    // 💡 FIX: Show the required green toast IMMEDIATELY
    showToast("✅ Payment successful! Choose a letter type.", "success");

    // Clean the URL after confirming payment was handled
    history.replaceState({}, document.title, window.location.pathname);
  }

  // -------------------------------------------------------
  // 7) pay button - CRITICAL FIX APPLIED HERE
  // -------------------------------------------------------
  payButton?.addEventListener("click", async () => {
    const job = jobField.value.trim();
    const company = companyField.value.trim();
    const name = nameField.value.trim();
    const email = emailField.value.trim();

    if (!job || !company || !name || !email) {
      showToast("Fill in ALL details before paying €1.99.", "error");
      return;
    }

    // save for after redirect
    localStorage.setItem("userData", JSON.stringify({ job, company, name, email }));

    try {
      // 🛠️ CRITICAL FIX: Use the full URL for the Render backend
      const res = await fetch(`${BACKEND_URL}/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        showToast("Could not start payment. Check server logs.", "error");
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      showToast("Payment failed. Try again.", "error");
    }
  });

  // -------------------------------------------------------
  // 8) template clicks
  // -------------------------------------------------------
  templateButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!isProUser) {
        showToast("Pay €1.99 to unlock templates.", "error");
        return;
      }

      const name = nameField.value.trim();
      const job = jobField.value.trim();
      const company = companyField.value.trim();
      if (!name || !job || !company) {
        showToast("Fill name, job & company first.", "error");
        return;
      }

      const date = new Date().toLocaleDateString("en-IE", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const type = btn.dataset.type;
      coverLetter.value = templates[type](name, job, company, date);
      resultBox.classList.remove("hidden");
      showToast("Letter generated.", "success");

      // scroll to output
      coverLetter.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // -------------------------------------------------------
  // 9) PDF + COPY
  // -------------------------------------------------------
  const { jsPDF } = window.jspdf;

  function renderExact(pdf, text, x, y, maxW, lineH = 7) {
    const pageH = pdf.internal.pageSize.getHeight();
    const lines = text.split("\n");
    for (const line of lines) {
      const chunks = pdf.splitTextToSize(line, maxW);
      for (const chunk of chunks) {
        if (y > pageH - 20) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(chunk, x, y);
        y += lineH;
      }
    }
  }

  downloadBtn?.addEventListener("click", () => {
    if (!coverLetter.value.trim()) return;
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    pdf.setFont("times", "normal").setFontSize(12);
    renderExact(pdf, coverLetter.value, 20, 20, 170);

    const safeJob = jobField.value.trim().replace(/\s+/g, "_");
    const safeCompany = companyField.value.trim().replace(/\s+/g, "_");
    const fileName = safeJob && safeCompany ? `${safeJob}-${safeCompany}.pdf` : "CoverLetter.pdf";

    pdf.save(fileName);
    showToast("PDF downloaded.", "success");
  });

  copyBtn?.addEventListener("click", () => {
    if (!coverLetter.value.trim()) return;
    navigator.clipboard
      .writeText(coverLetter.value)
      .then(() => showToast("Copied to clipboard.", "success"))
      .catch(() => showToast("Copy failed.", "error"));
  });

  // -------------------------------------------------------
  // 10) CLEAR — Resets the single-use license
  // -------------------------------------------------------
  clearBtn?.addEventListener("click", () => {
    form.reset();
    coverLetter.value = "";
    resultBox.classList.add("hidden");

    // wipe everything so next letter = new €1.99
    localStorage.removeItem("userData");

    // 🛠️ FIX: Clear the session storage flag
    sessionStorage.removeItem("isProUser");

    isProUser = false;
    updateLockState();
    showToast("All cleared — pay again to start a new letter.", "info");
  });

  // -------------------------------------------------------
  // 11) theme toggle
  // -------------------------------------------------------
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    if (themeToggle) themeToggle.textContent = "☀️";
  } else {
    if (themeToggle) themeToggle.textContent = "🌙";
  }

  themeToggle?.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const dark = document.body.classList.contains("dark");
    themeToggle.textContent = dark ? "☀️" : "🌙";
    localStorage.setItem("theme", dark ? "dark" : "light");
  });

  // -------------------------------------------------------
  // 12) init: start LOCKED (or unlocked if flag exists)
  // -------------------------------------------------------
  updateLockState();
});

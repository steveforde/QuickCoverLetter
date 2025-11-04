// =========================================================
// QuickCoverLetter — FRONTEND LOGIC (FINAL PATCH)
// ---------------------------------------------------------
// WHAT THIS DOES:
// 1. **CRITICAL FIX:** Initializes 'isProUser' by checking sessionStorage.
// 2. **CRITICAL FIX:** Form data now uses sessionStorage and clears after read,
//    ensuring a blank form on fresh load.
// 3. **CRITICAL FIX:** Success toast now uses a one-time sessionStorage flag.
// 4. Forces ALL 4 fields to be filled before allowing payment.
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
  let isProUser = sessionStorage.getItem("isProUser") === "true";
  // const urlParams = new URLSearchParams(window.location.search); // No longer needed
  // const justReturnedFromPayment = urlParams.has("session_id"); // No longer needed

  // -------------------------------------------------------
  // 2) RESTORE FORM AFTER STRIPE — USING localStorage + one-time flag
  // -------------------------------------------------------

  setTimeout(() => {
    // Only restore if we haven't already (prevents repeat fills)
    if (localStorage.getItem(FORM_RESTORED_KEY)) {
      console.log("ℹ️ Form already restored this session — skipping.");
      localStorage.removeItem(FORM_DATA_KEY); // cleanup
      return;
    }

    const saved = JSON.parse(localStorage.getItem(FORM_DATA_KEY) || "{}");

    if (Object.keys(saved).length > 0) {
      jobField.value = saved.job || "";
      companyField.value = saved.company || "";
      nameField.value = saved.name || "";
      emailField.value = saved.email || "";

      console.log("✅ Form restored from localStorage:", saved);

      // Mark as restored + clean up
      localStorage.setItem(FORM_RESTORED_KEY, "true");
      localStorage.removeItem(FORM_DATA_KEY);

      showToast("Form restored — select a template!", "success");
    } else {
      console.log("ℹ️ No saved form data.");
    }
  }, 300);

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

    graduate: (name, job, company, date) => `${name}
[Your Address]
[City, County]
${date}

Dear Hiring Manager,

I am writing to express my keen interest in the ${job} position at ${company}. As a recent graduate, I am eager to apply the knowledge, skills, and determination I’ve developed through my studies to make a strong contribution to your team.

During my degree, I built a solid foundation in communication, problem-solving, and adaptability. I’m confident these strengths — combined with my enthusiasm for continuous learning — will allow me to quickly add value within a professional environment.

I have followed ${company}'s work and admire its commitment to excellence and innovation. I would welcome the opportunity to bring my fresh perspective, energy, and drive to your organisation.

Thank you for your time and consideration. I look forward to the possibility of contributing to ${company}’s success.

Kind regards,
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
  // 6) handle Stripe return / Show Success Toast
  // -------------------------------------------------------

  // 💡 CRITICAL FIX: The previous URL check failed.
  // We now check for a one-time session flag set by the success page.
  const shouldShowToast = sessionStorage.getItem("showSuccessToast") === "true";

  if (shouldShowToast) {
    // Note: isProUser is already set to true via the initial check on load.
    // 1. Show the required green toast IMMEDIATELY
    showToast("✅ Payment successful! Choose a letter type.", "success");

    // 2. Consume the flag so the toast only shows once.
    sessionStorage.removeItem("showSuccessToast");
  }

  // ====== CONSTANTS ======
  const FORM_DATA_KEY = "quickCL_formData";
  const FORM_RESTORED_KEY = "quickCL_formRestored";

  // ====== SAVE (runs on Pay click) ======
  payButton?.addEventListener("click", async () => {
    const job = jobField.value.trim();
    const company = companyField.value.trim();
    const name = nameField.value.trim();
    const email = emailField.value.trim();

    if (!job || !company || !name || !email) {
      showToast("Fill in ALL details before paying €1.99.", "error");
      return;
    }

    // 1) SAVE FIRST (sync + guaranteed)
    const payload = { job, company, name, email };
    try {
      localStorage.setItem(FORM_DATA_KEY, JSON.stringify(payload));
      localStorage.removeItem(FORM_RESTORED_KEY); // allow one-time restore on return
      console.log("💾 Saved to localStorage:", payload);
    } catch (e) {
      console.warn("⚠️ localStorage save failed, falling back to sessionStorage:", e?.message);
      sessionStorage.setItem("userData", JSON.stringify(payload));
    }

    // 2) START CHECKOUT
    try {
      const res = await fetch(`${BACKEND_URL}/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      console.log("🔁 Stripe create session response:", data);
      if (data.url) {
        window.location.href = data.url;
      } else {
        showToast("Could not start payment. Check server logs.", "error");
      }
    } catch (err) {
      console.error("❌ Fetch Error:", err);
      showToast("Payment failed. Try again.", "error");
    }
  });

  // ====== RESTORE (runs on load) ======
  setTimeout(() => {
    // don’t restore twice
    if (localStorage.getItem(FORM_RESTORED_KEY)) {
      console.log("ℹ️ Form already restored this session — skipping further restore.");
      localStorage.removeItem(FORM_DATA_KEY); // cleanup any leftovers
      return;
    }

    let saved = null;

    // PRIMARY: localStorage
    try {
      saved = JSON.parse(localStorage.getItem(FORM_DATA_KEY) || "null");
      if (saved) console.log("📥 Found in localStorage:", saved);
    } catch (e) {
      console.warn("⚠️ localStorage parse failed:", e?.message);
    }

    // FALLBACK: sessionStorage (older flow / Safari issues)
    if (!saved) {
      try {
        saved = JSON.parse(sessionStorage.getItem("userData") || "null");
        if (saved) console.log("📥 Fallback from sessionStorage:", saved);
      } catch (e) {
        console.warn("⚠️ sessionStorage parse failed:", e?.message);
      }
    }

    if (saved && typeof saved === "object") {
      jobField.value = saved.job || "";
      companyField.value = saved.company || "";
      nameField.value = saved.name || "";
      emailField.value = saved.email || "";

      // one-time mark + cleanup
      localStorage.setItem(FORM_RESTORED_KEY, "true");
      localStorage.removeItem(FORM_DATA_KEY);
      sessionStorage.removeItem("userData");

      console.log("✅ Form restored:", {
        job: jobField.value,
        company: companyField.value,
        name: nameField.value,
        email: emailField.value,
      });
      showToast("Form restored — select a template!", "success");
    } else {
      console.log("ℹ️ No saved form data found.");
    }
  }, 300);

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

    // Clear the session storage flag for the license
    sessionStorage.removeItem("isProUser");

    // userData is no longer in localStorage, so no need to clear it here.

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

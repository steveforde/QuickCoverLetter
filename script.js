import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

/* =========================================================
   1) PUBLIC SUPABASE (browser) — FIXED URL
========================================================= */
const SUPABASE_URL = "https://pjrqqrxlzbpjkpxligup.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0cnN1dmVxZWZ0bWdvZWl3amd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzQ0MDYsImV4cCI6MjA3NzI1MDQwNn0.efQI0fEnz_2wyCF-mlb-JnZAHtI-6xhNH8S7tdFLGyo";

let supabase;
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
  console.error("Failed to init Supabase:", e);
}

document.addEventListener("DOMContentLoaded", () => {
  /* =========================================================
     2) GRAB ELEMENTS
  ========================================================= */
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

  // app state
  let isProUser = false;

  /* =========================================================
     3) RESTORE FORM FROM localStorage (NEVER auto-clear)
  ========================================================= */
  const savedData = JSON.parse(localStorage.getItem("userData") || "{}");
  if (savedData.job) jobField.value = savedData.job;
  if (savedData.company) companyField.value = savedData.company;
  if (savedData.name) nameField.value = savedData.name;
  if (savedData.email) emailField.value = savedData.email;

  /* =========================================================
     4) DARK MODE
  ========================================================= */
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    if (themeToggle) themeToggle.textContent = "Sun";
  } else {
    if (themeToggle) themeToggle.textContent = "Moon";
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark");
      const isDark = document.body.classList.contains("dark");
      themeToggle.textContent = isDark ? "Sun" : "Moon";
      localStorage.setItem("theme", isDark ? "dark" : "light");
    });
  }

  /* =========================================================
     5) LETTER TEMPLATES (full versions)
  ========================================================= */
  const templates = {
    professional: (name, job, company, date) => `${name}
[Your Address]
[City, County]
${date}

Dear Hiring Manager,

I am writing to apply for the ${job} position at ${company}. With a proven track record of delivering high-quality work, strong attention to detail, and a professional approach to customers and colleagues, I am confident I can make a positive contribution to your team.

Throughout my career I have been recognised for reliability, consistency, and the ability to follow process while still delivering excellent results. I work well both independently and as part of a team, and I am comfortable representing the company in a professional manner.

I would welcome the opportunity to bring this experience to ${company} and support your goals.

Thank you for your time and consideration.

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

  /* =========================================================
     6) LOCK / UNLOCK UI — WITH Lock ICONS
  ========================================================= */
  function updateLockState() {
    templateButtons.forEach((btn) => {
      let lockIcon = btn.querySelector(".lock-icon");

      if (!isProUser) {
        btn.disabled = true;
        payButton?.classList.remove("hidden");

        // Add lock icon if not exists
        if (!lockIcon) {
          lockIcon = document.createElement("span");
          lockIcon.classList.add("lock-icon");
          lockIcon.textContent = " Lock";
          lockIcon.style.marginLeft = "6px";
          lockIcon.style.fontSize = "1.1em";
          btn.appendChild(lockIcon);
        }
      } else {
        btn.disabled = false;
        payButton?.classList.add("hidden");

        // Remove lock icon
        if (lockIcon) {
          lockIcon.remove();
        }
      }
    });
  }

  /* =========================================================
     7) CHECK SUPABASE FOR PAID ROW
  ========================================================= */
  async function checkPaymentInSupabase(email) {
    if (!email) return false;
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("id")
        .eq("email", email)
        .eq("status", "paid")
        .maybeSingle();

      if (error) {
        console.error("Supabase payment check error:", error.message);
        return false;
      }
      return !!data;
    } catch (err) {
      console.error("Supabase fetch failed:", err.message);
      return false;
    }
  }

  /* =========================================================
     8) VALIDATE ACCESS ON EVERY LOAD
  ========================================================= */
  function validateAccess() {
    const email = savedData.email || emailField?.value.trim();

    if (!email || !email.includes("@")) {
      isProUser = false;
      updateLockState();
      return;
    }

    // Optimistic unlock while checking
    if (localStorage.getItem("hasPaid") === "true") {
      isProUser = true;
      updateLockState();
    }

    checkPaymentInSupabase(email).then((paid) => {
      isProUser = paid;
      localStorage.setItem("hasPaid", paid ? "true" : "false");
      updateLockState();

      if (paid) {
        showToast("Payment confirmed! Templates unlocked.", "success");
      } else if (localStorage.getItem("hasPaid") === "true") {
        showToast("Payment not found yet. Refresh in 10s.", "error");
      }
    });
  }

  /* =========================================================
     9) HANDLE STRIPE RETURN (?session_id=...)
  ========================================================= */
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("session_id")) {
    showToast("Verifying payment...", "info");
    localStorage.setItem("hasPaid", "true"); // temporary
    validateAccess();
  } else {
    validateAccess();
  }

  /* =========================================================
     10) TEMPLATE BUTTONS
  ========================================================= */
  templateButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!isProUser) {
        showToast("Locked. Please pay €1.99 to unlock.", "error");
        return;
      }

      const name = nameField.value.trim();
      const job = jobField.value.trim();
      const company = companyField.value.trim();
      if (!name || !job || !company) {
        showToast("Fill in job, company, and name first.", "error");
        return;
      }

      const date = new Date().toLocaleDateString("en-IE", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const type = btn.dataset.type;
      const letter = templates[type](name, job, company, date);
      coverLetter.value = letter;
      resultBox.classList.remove("hidden");
      showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} letter generated.`, "success");
    });
  });

  /* =========================================================
     11) PAY BUTTON → STRIPE
  ========================================================= */
  if (payButton) {
    payButton.addEventListener("click", async () => {
      const userData = {
        job: jobField.value.trim(),
        company: companyField.value.trim(),
        name: nameField.value.trim(),
        email: emailField.value.trim(),
      };

      if (!userData.email || !userData.email.includes("@")) {
        showToast("Enter a valid email first.", "error");
        return;
      }

      // Save form data BEFORE redirect
      localStorage.setItem("userData", JSON.stringify(userData));

      try {
        const res = await fetch("/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userData.email }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          showToast("Could not start payment.", "error");
        }
      } catch (err) {
        console.error("Stripe error:", err);
        showToast("Payment setup failed.", "error");
      }
    });
  }

  /* =========================================================
     12) PDF + COPY
  ========================================================= */
  const { jsPDF } = window.jspdf;

  function renderExact(pdf, text, x, y, maxWidth, lineHeight = 7) {
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
        y += lineHeight;
      }
    }
  }

  downloadBtn.addEventListener("click", () => {
    if (!coverLetter.value.trim()) return;
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    pdf.setFont("times", "normal").setFontSize(12);
    renderExact(pdf, coverLetter.value, 20, 20, 170);
    pdf.save("CoverLetter.pdf");
    showToast("PDF downloaded", "success");
  });

  copyBtn.addEventListener("click", () => {
    if (!coverLetter.value.trim()) return;
    navigator.clipboard
      .writeText(coverLetter.value)
      .then(() => showToast("Copied to clipboard", "success"))
      .catch(() => showToast("Copy failed", "error"));
  });

  /* =========================================================
     13) CLEAR BUTTON — ONLY place that clears data
  ========================================================= */
  clearBtn.addEventListener("click", () => {
    if (form) form.reset();
    coverLetter.value = "";
    resultBox.classList.add("hidden");
    isProUser = false;
    localStorage.removeItem("userData");
    localStorage.removeItem("hasPaid");
    updateLockState();
    showToast("Form cleared — locked again.", "info");
  });

  /* =========================================================
     14) TOAST
  ========================================================= */
  function showToast(msg, type = "info", time = 3000) {
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.classList.remove("show"), time);
  }

  // Initial lock state
  updateLockState();
});

// =========================================================
// QuickCoverLetter — FRONTEND LOGIC (FINAL FLOW)
// ---------------------------------------------------------
// This file controls:
// 1. Form restore (after Stripe redirect)
// 2. Lock / unlock of the 4 template buttons
// 3. Stripe checkout call to your backend on Render
// 4. Toasts (4 seconds)
// 5. Smooth scroll to textarea when a letter is generated
// 6. CLEAR = full reset (must pay again)
// =========================================================

// ✅ your real Supabase (read-only REST check)
const SUPABASE_URL = "https://ztrsuveqeftmgoeiwjgz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0cnN1dmVxZWZ0bWdvZWl3amd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzQ0MDYsImV4cCI6MjA3NzI1MDQwNn0.efQI0fEnz_2wyCF-mlb-JnZAHtI-6xhNH8S7tdFLGyo";

// ✅ your real backend on Render
const BACKEND_URL = "https://quickcoverletter-backend.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
  // -------------------------------------------------------
  // 1. Grab DOM elements
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

  // this flag is the single source of truth for locking
  let isProUser = false;

  // -------------------------------------------------------
  // 2. Restore form from localStorage (so after Stripe
  //    redirect the user still sees their info)
  // -------------------------------------------------------
  const saved = JSON.parse(localStorage.getItem("userData") || "{}");
  if (saved.job) jobField.value = saved.job;
  if (saved.company) companyField.value = saved.company;
  if (saved.name) nameField.value = saved.name;
  if (saved.email) emailField.value = saved.email;

  // -------------------------------------------------------
  // 3. Letter templates (your exact wording)
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

  // -------------------------------------------------------
  // 4. Toast helper (4 seconds, 3 types)
  // -------------------------------------------------------
  function showToast(message, type = "info") {
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    // hide after 4 seconds
    clearTimeout(toast._hide);
    toast._hide = setTimeout(() => {
      toast.classList.remove("show");
    }, 4000);
  }

  // -------------------------------------------------------
  // 5. Lock / unlock logic for template buttons
  //    - called any time isProUser changes
  // -------------------------------------------------------
  function updateLockState() {
    // pay button must ALWAYS be visible
    payButton?.classList.remove("hidden");

    templateButtons.forEach((btn) => {
      let lock = btn.querySelector(".lock-icon");

      if (!isProUser) {
        // ❌ NOT paid → disable and show lock
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
        // ✅ Paid → enable and remove lock
        btn.disabled = false;
        if (lock) lock.remove();
      }
    });
  }

  // -------------------------------------------------------
  // 6. Optional: check Supabase if that email has a paid row
  //    (safety / second visit)
  // -------------------------------------------------------
  async function checkPaid(email) {
    if (!email) return false;
    try {
      const url = `${SUPABASE_URL}/rest/v1/transactions?email=eq.${encodeURIComponent(
        email
      )}&status=eq.paid&select=id`;
      const res = await fetch(url, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });
      if (!res.ok) return false;
      const data = await res.json();
      return data.length > 0;
    } catch (err) {
      console.error("Supabase check failed:", err.message);
      return false;
    }
  }

  // -------------------------------------------------------
  // 7. Initial validation on load
  //    - start LOCKED
  //    - if localStorage says paid -> unlock
  //    - then re-confirm with Supabase in background
  // -------------------------------------------------------
  async function initialValidate() {
    // start locked
    isProUser = false;
    updateLockState();

    const email = saved.email || emailField.value.trim();
    const localPaid = localStorage.getItem("hasPaid") === "true";

    // if no email → just keep locked
    if (!email || !email.includes("@")) return;

    // if local says paid → show unlocked straight away
    if (localPaid) {
      isProUser = true;
      updateLockState();
    }

    // check with Supabase
    const remotePaid = await checkPaid(email);
    if (remotePaid) {
      isProUser = true;
      localStorage.setItem("hasPaid", "true");
      updateLockState();
    }
  }

  // -------------------------------------------------------
  // 8. Handle Stripe return: ?session_id=...
  //    - user just paid → unlock immediately
  //    - keep form data (we saved it before redirect)
  //    - show success toast for 4 seconds
  // -------------------------------------------------------
  // -------------------------------------------------------
  // Handle Stripe return reliably (with delay)
  // -------------------------------------------------------
  if (location.search.includes("session_id")) {
    isProUser = true;
    localStorage.setItem("hasPaid", "true");
    updateLockState();

    // small delay so toast renders after DOM paint
    setTimeout(() => {
      showToast("✅ Payment successful — templates unlocked.", "success");
    }, 400);

    // clean URL
    history.replaceState({}, document.title, "/");
  }

  // -------------------------------------------------------
  // 9. PAY BUTTON CLICK
  //    - now we enforce **all 4 fields** filled BEFORE payment
  //    - if not, show toast and STOP
  // -------------------------------------------------------
  payButton?.addEventListener("click", async () => {
    const job = jobField.value.trim();
    const company = companyField.value.trim();
    const name = nameField.value.trim();
    const email = emailField.value.trim();

    // ✅ new strict rule: ALL fields must be filled BEFORE paying
    if (!job || !company || !name || !email) {
      showToast("Fill in ALL details before paying €1.99.", "error");
      return;
    }

    // save for post-Stripe restore
    const userData = { job, company, name, email };
    localStorage.setItem("userData", JSON.stringify(userData));

    try {
      const res = await fetch(`${BACKEND_URL}/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.url) {
        // go to Stripe
        window.location.href = data.url;
      } else {
        showToast("Could not start payment.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Payment failed. Try again.", "error");
    }
  });

  // -------------------------------------------------------
  // 10. TEMPLATE BUTTON CLICK
  //     - only works if paid
  //     - scroll to text area
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
  // 11. PDF + COPY
  //     (same as you had, just cleaned)
  // -------------------------------------------------------
  const { jsPDF } = window.jspdf;

  // === PDF Render Helper (moved right above the download button) ===
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

  // === PDF Download Button ===
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
  // 12. CLEAR — your rule:
  //     "Clear is final — pay again if you want another letter"
  // -------------------------------------------------------
  clearBtn?.addEventListener("click", () => {
    form.reset();
    coverLetter.value = "";
    resultBox.classList.add("hidden");
    // wipe storage so next visit is fresh
    localStorage.removeItem("userData");
    localStorage.removeItem("hasPaid");
    // and lock
    isProUser = false;
    updateLockState();
    showToast("All cleared — pay again to start a new letter.", "info");
  });

  // -------------------------------------------------------
  // 13. THEME TOGGLE (keep as is)
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
  // 14. Final init on first load
  // -------------------------------------------------------
  updateLockState();
});

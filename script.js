import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

/* =========================================================
   QUICKCOVERLETTER — YOUR VERSION (MINIMAL PATCH)
   ---------------------------------------------------------
   ✅ Fixes:
   1. Start LOCKED and only unlock if paid
   2. Use absolute backend URL for Stripe
   3. Clear does NOT wipe payment
========================================================= */

const SUPABASE_URL = "https://ztrsuveqeftmgoeiwjgz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0cnN1dmVxZWZ0bWdvZWl3amd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzQ0MDYsImV4cCI6MjA3NzI1MDQwNn0.efQI0fEnz_2wyCF-mlb-JnZAHtI-6xhNH8S7tdFLGyo";

// 👉 use your real backend, not relative
const BACKEND_URL = "https://quickcoverletter-backend.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
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

  let isProUser = false;

  // restore saved form
  const saved = JSON.parse(localStorage.getItem("userData") || "{}");
  if (saved.job) jobField.value = saved.job;
  if (saved.company) companyField.value = saved.company;
  if (saved.name) nameField.value = saved.name;
  if (saved.email) emailField.value = saved.email;

  // your templates (unchanged)
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

  // 🔒 same function, but we don’t spam or append 20 locks
  function updateLockState() {
    templateButtons.forEach((btn) => {
      let lock = btn.querySelector(".lock-icon");
      if (!isProUser) {
        btn.disabled = true;
        payButton?.classList.remove("hidden");
        if (!lock) {
          lock = document.createElement("span");
          lock.className = "lock-icon";
          lock.textContent = " 🔒";
          lock.style.marginLeft = "6px";
          lock.style.color = "#ff6b6b";
          btn.appendChild(lock);
        }
      } else {
        btn.disabled = false;
        payButton?.classList.add("hidden");
        if (lock) lock.remove();
      }
    });
  }

  async function checkPaid(email) {
    if (!email) return false;
    try {
      const url = `${SUPABASE_URL}/rest/v1/transactions?email=eq.${encodeURIComponent(
        email
      )}&status=eq.paid&select=id`;
      const res = await fetch(url, {
        method: "GET",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      });
      if (!res.ok) return false;
      const data = await res.json();
      return data.length > 0;
    } catch (e) {
      console.error("Supabase check failed:", e.message);
      return false;
    }
  }

  // ✅ this was the main problem: it was unlocking too early
  function validate() {
    const email = saved.email || emailField.value.trim();

    // no email → keep locked, no toast
    if (!email || !email.includes("@")) {
      isProUser = false;
      updateLockState();
      return;
    }

    // check localStorage but DON'T show unlocked yet
    const localPaid = localStorage.getItem("hasPaid") === "true";

    // start locked
    isProUser = false;
    updateLockState();

    // now check Supabase
    checkPaid(email).then((paid) => {
      const finalPaid = paid || localPaid;
      isProUser = finalPaid;
      localStorage.setItem("hasPaid", finalPaid ? "true" : "false");
      updateLockState();
      // no noisy toast on load
    });
  }

  // ✅ handle Stripe return
  if (location.search.includes("session_id")) {
    // user just paid → trust it
    localStorage.setItem("hasPaid", "true");
    isProUser = true;
    updateLockState();
    // clean URL
    history.replaceState({}, document.title, "/");
    // we can sync with Supabase in background
    setTimeout(validate, 2000);
  } else {
    validate();
  }

  // 💳 Stripe pay
  payButton?.addEventListener("click", async () => {
    const userData = {
      job: jobField.value.trim(),
      company: companyField.value.trim(),
      name: nameField.value.trim(),
      email: emailField.value.trim(),
    };
    localStorage.setItem("userData", JSON.stringify(userData));

    if (!userData.email.includes("@")) {
      showToast("Enter a valid email.", "error");
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userData.email }),
      });
      const data = await res.json();
      if (data.url) {
        location.href = data.url;
      } else {
        showToast("Could not start payment.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Payment failed.", "error");
    }
  });

  // template clicks
  templateButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!isProUser) {
        showToast("Pay €1.99 to unlock.", "error");
        return;
      }

      const name = nameField.value.trim();
      const job = jobField.value.trim();
      const company = companyField.value.trim();
      if (!name || !job || !company) {
        showToast("Fill name, job & company.", "error");
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
      showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} letter generated!`, "success");
    });
  });

  // PDF + copy (your original logic)
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
    pdf.save("CoverLetter.pdf");
    showToast("PDF downloaded", "success");
  });

  copyBtn?.addEventListener("click", () => {
    if (!coverLetter.value.trim()) return;
    navigator.clipboard
      .writeText(coverLetter.value)
      .then(() => showToast("Copied to clipboard", "success"))
      .catch(() => showToast("Copy failed", "error"));
  });

  // 🧹 CLEAR — but KEEP PAYMENT
  clearBtn?.addEventListener("click", () => {
    form.reset();
    coverLetter.value = "";
    resultBox.classList.add("hidden");
    localStorage.removeItem("userData");

    // KEEP hasPaid!
    const stillPaid = localStorage.getItem("hasPaid") === "true";
    isProUser = stillPaid;
    updateLockState();
    showToast("Form cleared.", "success");
  });

  function showToast(msg, type = "info", time = 3000) {
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.classList.remove("show"), time);
  }

  // theme (your version)
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    themeToggle && (themeToggle.textContent = "☀️");
  } else {
    themeToggle && (themeToggle.textContent = "🌙");
  }

  themeToggle?.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const dark = document.body.classList.contains("dark");
    themeToggle.textContent = dark ? "☀️" : "🌙";
    localStorage.setItem("theme", dark ? "dark" : "light");
  });

  // start locked
  updateLockState();
});

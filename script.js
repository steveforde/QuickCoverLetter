// =========================================================
// QuickCoverLetter — FINAL FRONTEND (StoreKit Ready & Templates Restored)
// =========================================================

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// (Optional) Supabase init
createClient(
  "https://ztrsuveqeftmgoeiwjgz.supabase.co",
  "eyJhbGciOiJISInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0cnN1dmVxZWZ0bWdvZWl3amd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzQ0MDYsImV4cCI6MjA3NzI1MDQwNn0.efQI0fEnz_2wyCF-mlb-JnZAHtI-6xhNH8S7tdFLGyo"
);

// ===== KEYS (sessionStorage only) =====
const K = {
  PRO: "qcl_isPro",
  FORM: "qcl_form",
  THEME: "qcl_theme",
};

document.addEventListener("DOMContentLoaded", () => {
  // ------- DOM -------
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

  // ------- State -------
  let isPro = sessionStorage.getItem(K.PRO) === "true";

  // =================================================
  // BLOCK 1: RESTORE FORM
  // =================================================
  try {
    const saved = JSON.parse(sessionStorage.getItem(K.FORM) || "{}");
    if (saved.job) jobField.value = saved.job;
    if (saved.company) companyField.value = saved.company;
    if (saved.name) nameField.value = saved.name;
    if (saved.email) emailField.value = saved.email;
  } catch {}

  // =================================================
  // BLOCK 3: IAP SUCCESS HANDLER (NEW)
  // This function is called by the native Swift code upon successful payment.
  // =================================================
  window.handleIAPSuccess = (emailAddress) => {
    sessionStorage.setItem(K.PRO, "true");
    isPro = true;
    updateLockState();

    // Log success email request
    console.log("IAP Success - Sending receipt email to:", emailAddress);

    showToast("✅ Templates unlocked! Choose a letter style.", "success");

    // Rerun updateLockState after unlocking
    updateLockState();
  };

  // Save as user types (sessionStorage only)
  form?.addEventListener("input", () => {
    sessionStorage.setItem(
      K.FORM,
      JSON.stringify({
        job: jobField.value,
        company: companyField.value,
        name: nameField.value,
        email: emailField.value,
      })
    );
  });

  // ------- Theme (sessionStorage only) -------
  const applyTheme = () => {
    const t = sessionStorage.getItem(K.THEME) || "light";
    document.body.classList.toggle("dark", t === "dark");
    if (themeToggle) themeToggle.textContent = t === "dark" ? "Light" : "Dark";
  };
  applyTheme();

  themeToggle?.addEventListener("click", () => {
    const next = document.body.classList.contains("dark") ? "light" : "dark";
    sessionStorage.setItem(K.THEME, next);
    applyTheme();
  });

  window.enablePayButton = (price) => {
    const btn = document.getElementById("payButton");
    if (btn) {
      btn.disabled = false;
      btn.textContent = `Pay ${price} to Unlock a letter`;
    }
  };

  // ------- Lock/Unlock UI -------
  function updateLockState() {
    payButton?.classList.remove("hidden");
    templateButtons.forEach((btn) => {
      let lock = btn.querySelector(".lock-icon");
      if (!isPro) {
        btn.disabled = true;
        if (!lock) {
          lock = document.createElement("span");
          lock.className = "lock-icon";
          lock.textContent = " Locked";
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
  updateLockState();

  // ------- Toast -------
  function showToast(msg, type = "info") {
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `toast ${type} show`;
    clearTimeout(toast._hide);
    toast._hide = setTimeout(() => toast.classList.remove("show"), 4000);
  }

  // ------- Templates (RESTORED) -------
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

I am known for being approachable, dependable, and easy to work with. I bring good communication skills, patience, and a genuine interest in helping others — which I believe would be a a good fit for ${company}.

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

  // ------- Pay → Trigger Native IAP Purchase (FIXED) -------
  payButton?.addEventListener("click", async () => {
    const job = jobField.value.trim();
    const company = companyField.value.trim();
    const name = nameField.value.trim();
    const email = emailField.value.trim();

    if (!job || !company || !name || !email) {
      showToast("Fill in ALL details before paying €1.99.", "error");
      return;
    }

    sessionStorage.setItem(K.FORM, JSON.stringify({ job, company, name, email }));

    payButton.disabled = true;
    const original = payButton.textContent;
    payButton.textContent = "Processing Payment...";

    try {
      // 🟢 FIXED LOGIC: Checks if "isIOSApp" flag exists (set by Swift) OR if webkit bridge exists
      if (
        window.isIOSApp ||
        (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.purchase)
      ) {
        // Send the message to Swift
        window.webkit.messageHandlers.purchase.postMessage(email);
      } else {
        // If we are NOT in the app, we log it, but we DO NOT show the red error to the user.
        console.log("Not running inside iOS App or Bridge not ready.");

        // Optional: Reset button so it doesn't stay stuck on "Processing"
        setTimeout(() => {
          payButton.disabled = false;
          payButton.textContent = original;
        }, 2000);
      }
    } catch (e) {
      console.error("Payment Error:", e);
      // Only show generic error, not the "Service Not Available" one
      showToast("Connection error. Please try again.", "error");
      payButton.disabled = false;
      payButton.textContent = original;
    }
  });

  // ------- Template clicks (RESTORED) -------
  templateButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!isPro) return showToast("Pay €1.99 to unlock a template.", "error");

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
      coverLetter.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // ------- PDF + Copy (RESTORED) -------
  downloadBtn?.addEventListener("click", () => {
    if (!coverLetter.value.trim()) return;

    // 1. Generate PDF in memory
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    pdf.setFont("times", "normal").setFontSize(12);
    renderExact(pdf, coverLetter.value, 20, 20, 170);

    const safeJob = jobField.value.trim().replace(/\s+/g, "_");
    const safeCompany = companyField.value.trim().replace(/\s+/g, "_");
    const fileName = safeJob && safeCompany ? `${safeJob}-${safeCompany}.pdf` : "CoverLetter.pdf";

    // 2. CHECK: Are we in the iOS App?
    if (
      window.webkit &&
      window.webkit.messageHandlers &&
      window.webkit.messageHandlers.downloadPDF
    ) {
      // 🟢 iOS MODE: Send the raw data string to the app
      const pdfData = pdf.output("datauristring"); // Returns "data:application/pdf;base64,JVBERi..."

      // We send an object containing the name and the data
      window.webkit.messageHandlers.downloadPDF.postMessage({
        fileName: fileName,
        fileData: pdfData,
      });

      showToast("PDF sent to App.", "success");
    } else {
      // ⚪️ REGULAR WEB MODE: Download normally
      pdf.save(fileName);
      showToast("PDF downloaded.", "success");
    }
  });

  copyBtn?.addEventListener("click", () => {
    if (!coverLetter.value.trim()) return;
    navigator.clipboard
      .writeText(coverLetter.value)
      .then(() => showToast("Copied to clipboard.", "success"))
      .catch(() => showToast("Copy failed.", "error"));
  });

  // ------- Clear (reset + relock) (RESTORED) -------
  clearBtn?.addEventListener("click", () => {
    form.reset();
    coverLetter.value = "";
    resultBox.classList.add("hidden");

    sessionStorage.removeItem(K.FORM);
    sessionStorage.removeItem(K.PRO);

    isPro = false;
    updateLockState();
    showToast("All cleared — pay again to start a new letter.", "info");
  });

  // Rerun updateLockState after all listeners are set up
  updateLockState();
});

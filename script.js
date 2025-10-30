import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

/* =========================================================
   🔑 SUPABASE INITIALIZATION (PUBLIC KEYS)
========================================================= */
const SUPABASE_URL = "https://pjrqqrxlzbpjkpxligup.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0cnN1dmVxZWZ0bWdvZWl3amd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NzQ0MDYsImV4cCI6MjA3NzI1MDQwNn0.efQI0fEnz_2wyCF-mlb-JnZAHtI-6xhNH8S7tdFLGyo";
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
     💳 STRIPE RETURN HANDLER
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
  .eq("status", "paid")
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
     ✉️ FULL LETTER TEMPLATES
  ========================================================= */
  const templates = {
    professional: (n, j, c, d) => `${n}
[Your Address]
[City, County]
${d}

Dear Hiring Manager,

I am writing to apply for the ${j} position at ${c}. With a proven track record of delivering high-quality results and a strong commitment to professional excellence, I am confident in my ability to make a valuable contribution to your team.

Throughout my career, I have developed a reputation for reliability, attention to detail, and the ability to perform under pressure. I take pride in working collaboratively while maintaining accountability for my own responsibilities. My focus has always been on providing consistent, accurate, and professional outcomes that reflect well on both myself and the company I represent.

I am confident that my work ethic, adaptability, and communication skills will make me a valuable addition to your team. I am eager to bring my skills to ${c} and continue developing within a professional environment that values dedication and quality.

Thank you for taking the time to consider my application. I would be delighted to discuss how my background and work ethic align with the needs of ${c}.

Sincerely,
${n}`,

    formal: (n, j, c, d) => `${n}
[Your Address]
[City, County]
${d}

Dear Hiring Manager,

I am writing to formally express my interest in the ${j} position at ${c}. With a consistent record of professionalism, reliability, and attention to detail, I take pride in maintaining the highest standards of performance in every role I undertake.

Throughout my career, I have developed strong organisational and communication skills, alongside the ability to manage multiple priorities with precision and care. I am known for my commitment to accuracy, dependability, and a methodical approach to achieving results.

I am particularly drawn to ${c} because of its reputation for excellence and its dedication to fostering a professional and supportive working environment. I believe my background, work ethic, and respect for process align closely with your company’s values.

Thank you for taking the time to consider my application. I would welcome the opportunity to discuss how my experience and dedication could contribute to the continued success of ${c}.

Yours faithfully,
${n}`,

    friendly: (n, j, c, d) => `${n}
[Your Address]
[City, County]
${d}

Dear Hiring Manager,

I’m excited to apply for the ${j} position at ${c}. I’ve always believed that great results come from teamwork, clear communication, and a genuine passion for helping others — values I bring to every role I take on.

In my previous positions, I’ve developed a reputation for being approachable, dependable, and proactive. I take pride in supporting colleagues and customers alike, solving challenges with patience, positivity, and a can-do attitude. Whether assisting a busy team or managing day-to-day responsibilities, I strive to create a positive and productive working environment.

What stands out to me about ${c} is its commitment to quality, collaboration, and care — qualities I deeply value. I would love the opportunity to bring my enthusiasm and reliability to your team and play a part in ${c}’s continued success.

Kind regards,
${n}`,

    artistic: (n, j, c, d) => `${n}
[Your Address]
[City, County]
${d}

Dear Hiring Manager,

I’m excited to express my interest in the ${j} position at ${c}. My approach to work is guided by creativity, precision, and purpose — qualities that allow me to bring fresh ideas to life while maintaining a high standard of professionalism.

Throughout my career, I’ve honed the ability to balance imagination with structure. Whether developing concepts, solving visual challenges, or collaborating on campaigns, I take pride in producing work that is both innovative and thoughtfully executed. Every project I undertake is an opportunity to craft something meaningful and memorable.

What draws me to ${c} is its forward-thinking vision and commitment to creative excellence. I’m inspired by organisations that value originality and collaboration, and I’m eager to contribute my ideas, design sense, and dedication to ${c}’s continued growth and success.

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
     🔔 TOAST FUNCTION
  ========================================================= */
  function showToast(msg, type = "info", time = 3000) {
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `toast show ${type}`;
    setTimeout(() => toast.classList.remove("show"), time);
  }
});

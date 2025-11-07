import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const BACKEND_URL = "https://quickcoverletter-backend.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form");
  const job = document.getElementById("jobTitle");
  const company = document.getElementById("companyName");
  const name = document.getElementById("userName");
  const email = document.getElementById("userEmail");
  const payButton = document.getElementById("payButton");
  const templateButtons = document.querySelectorAll(".template-btn");
  const resultBox = document.getElementById("resultBox");
  const coverLetter = document.getElementById("coverLetter");
  const clearBtn = document.getElementById("clearBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const copyBtn = document.getElementById("copyBtn");
  const toast = document.getElementById("toast");
  const themeToggle = document.getElementById("themeToggle");

  let isPro = sessionStorage.getItem("pro") === "true";

  const qs = new URLSearchParams(location.search);
  const session_id = qs.get("session_id");
  const cancelled = qs.get("status") === "cancelled";

  if (session_id) {
    isPro = true;
    sessionStorage.setItem("pro", "true");
    history.replaceState({}, "", "/");
  }

  if (cancelled) {
    sessionStorage.removeItem("pro");
    isPro = false;
    history.replaceState({}, "", "/");
  }

  function showToast(msg, type = "info") {
    toast.textContent = msg;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove("show"), 5000);
  }

  function lockState() {
    templateButtons.forEach((btn) => {
      btn.disabled = !isPro;
      let lock = btn.querySelector(".lock-icon");
      if (!isPro && !lock) {
        lock = document.createElement("span");
        lock.className = "lock-icon";
        lock.textContent = " Locked";
        lock.style.marginLeft = "6px";
        lock.style.color = "#ff6b6b";
        lock.style.fontWeight = "bold";
        btn.appendChild(lock);
      }
      if (isPro && lock) lock.remove();
    });
  }
  lockState();

  const TEMPLATES = {
    professional: (n, j, c, d) => `${n}
[Your Address]
[City, County]
${d}

Dear Hiring Manager,

I am writing to apply for the ${j} position at ${c}. With a proven track record of delivering high-quality work, strong attention to detail, and a professional approach to customers and colleagues, I am confident I can make a positive contribution to your team.

Throughout my career I have been recognised for reliability, consistency, and the ability to follow process while still delivering excellent results. I work well both independently and as part of a team, and I am comfortable representing the company in a professional manner.

I would welcome the opportunity to bring this experience to ${c} and support your goals.

Thank you for your time and consideration.

Sincerely,
${n}`,
    formal: (n, j, c, d) => `${n}
[Your Address]
[City, County]
${d}

Dear Hiring Manager,

I wish to formally express my interest in the ${j} role at ${c}. I have always maintained high professional standards in every position I have held, ensuring accuracy, clear communication, and respect for established procedures.

In previous roles I have been trusted to manage tasks carefully, meet deadlines, and support both customers and internal teams. I believe these skills would transfer well to ${c}, particularly in a role that values professionalism and reliability.

I would appreciate the opportunity to discuss how my background aligns with your current requirements.

Yours faithfully,
${n}`,
    friendly: (n, j, c, d) => `${n}
[Your Address]
[City, County]
${d}

Dear Hiring Manager,

I am excited to apply for the ${j} position at ${c}. I enjoy working with people, solving problems in a calm and practical way, and creating a positive experience for customers and colleagues.

I am known for being approachable, dependable, and easy to work with. I bring good communication skills, patience, and a genuine interest in helping others — which I believe would be a good fit for ${c}.

Thank you for considering my application. I would be happy to speak further about how I can contribute to your team.

Kind regards,
${n}`,
    artistic: (n, j, c, d) => `${n}
[Your Address]
[City, County]
${d}

Dear Hiring Manager,

I am writing to express my interest in the ${j} role at ${c}. I take pride in producing work that is thoughtful, well-presented, and aligned with the organisation’s values. I balance creativity with structure, and I always aim to deliver work that looks professional and represents the company well.

What interests me in ${c} is its focus on quality and forward thinking. I would welcome the chance to bring my ideas, attention to detail, and strong work ethic to your team.

Thank you for your time and consideration.

Warm regards,
${n}`,
    graduate: (n, j, c, d) => `${n}
[Your Address]
[City, County]
${d}

Dear Hiring Manager,

I am writing to express my keen interest in the ${j} position at ${c}. As a recent graduate, I am eager to apply the knowledge, skills, and determination I’ve developed through my studies to make a strong contribution to your team.

During my degree, I built a solid foundation in communication, problem-solving, and adaptability. I’m confident these strengths — combined with my enthusiasm for continuous learning — will allow me to quickly add value within a professional environment.

I have followed ${c}'s work and admire its commitment to excellence and innovation. I would welcome the opportunity to bring my fresh perspective, energy, and drive to your organisation.

Thank you for your time and consideration.

Kind regards,
${n}`,
  };

  const saved = sessionStorage.getItem("form");
  if (saved) {
    const s = JSON.parse(saved);
    job.value = s.j || "";
    company.value = s.c || "";
    name.value = s.n || "";
    email.value = s.e || "";
  }

  form.addEventListener("input", () => {
    sessionStorage.setItem(
      "form",
      JSON.stringify({
        j: job.value,
        c: company.value,
        n: name.value,
        e: email.value,
      })
    );
  });

  payButton.addEventListener("click", async () => {
    if (!job.value || !company.value || !name.value || !email.value)
      return showToast("Fill in details first", "error");
    payButton.disabled = true;
    const res = await fetch(`${BACKEND_URL}/create-checkout-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.value }),
    });
    const data = await res.json();
    if (data.url) location.href = data.url;
  });

  templateButtons.forEach((btn) =>
    btn.addEventListener("click", () => {
      if (!isPro) return showToast("Pay €1.99 to unlock", "error");
      const t = btn.dataset.type;
      const d = new Date().toLocaleDateString("en-IE", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      coverLetter.value = TEMPLATES[t](name.value, job.value, company.value, d);
      resultBox.classList.remove("hidden");
    })
  );

  downloadBtn.addEventListener("click", () => {
    if (!coverLetter.value.trim()) return;
    const pdf = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
    pdf.setFont("times", "normal").setFontSize(12);
    pdf.text(coverLetter.value, 20, 20, { maxWidth: 170 });
    pdf.save("CoverLetter.pdf");
  });

  copyBtn.addEventListener("click", () =>
    navigator.clipboard.writeText(coverLetter.value).then(() => showToast("Copied", "success"))
  );

  clearBtn.addEventListener("click", () => {
    form.reset();
    resultBox.classList.add("hidden");
    sessionStorage.clear();
    isPro = false;
    lockState();
    showToast("Cleared", "info");
  });

  if (session_id) showToast("Unlocked. Choose a template.", "success");
});

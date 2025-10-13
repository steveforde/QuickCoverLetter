document.addEventListener("DOMContentLoaded", () => {
  const generateBtn = document.getElementById("generateBtn");
  const jobInput = document.getElementById("jobTitle");
  const companyInput = document.getElementById("companyName");
  const userNameInput = document.getElementById("userName");
  const toneSelect = document.getElementById("tone");
  const coverLetter = document.getElementById("coverLetter");
  const resultBox = document.getElementById("resultBox");
  const spinner = document.getElementById("spinner");
  const clearBtn = document.getElementById("clearBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const copyBtn = document.getElementById("copyBtn");

  generateBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const jobTitle = jobInput.value.trim();
    const companyName = companyInput.value.trim();
    const userName = userNameInput.value.trim();
    const tone = toneSelect.value;

    if (!jobTitle || !companyName) {
      alert("Please fill out both Job Title and Company Name.");
      return;
    }

    // start spinner
    generateBtn.disabled = true;
    spinner.classList.remove("hidden");
    generateBtn.textContent = "Generating...";

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobTitle, companyName, tone, userName }),
      });

      const data = await res.json();
      if (data.coverLetter) {
        coverLetter.value = data.coverLetter;
        resultBox.classList.remove("hidden");
        resultBox.scrollIntoView({ behavior: "smooth" });
      } else {
        alert("Error generating cover letter. Try again.");
      }
    } catch (err) {
      console.error("❌ Fetch failed:", err);
      alert("Server error. Please try again.");
    } finally {
      spinner.classList.add("hidden");
      generateBtn.disabled = false;
      generateBtn.textContent = "Generate Your Letter";
    }
  });

  clearBtn.addEventListener("click", () => {
    jobInput.value = "";
    companyInput.value = "";
    userNameInput.value = "";
    toneSelect.selectedIndex = 0;
    coverLetter.value = "";
    resultBox.classList.add("hidden");
  });

  downloadBtn.addEventListener("click", () => {
    const text = coverLetter.value.trim();
    if (!text) return alert("No cover letter to download.");
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    pdf.setFont("times", "normal");
    pdf.setFontSize(12);
    pdf.text(text, 10, 20, { maxWidth: 180, align: "left" });
    pdf.save("cover_letter.pdf");
  });

  copyBtn.addEventListener("click", () => {
    const text = coverLetter.value.trim();
    if (!text) return alert("Nothing to copy.");
    navigator.clipboard.writeText(text)
      .then(() => alert("✅ Copied to clipboard"))
      .catch(() => alert("❌ Failed to copy"));
  });
});


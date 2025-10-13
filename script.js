document.addEventListener("DOMContentLoaded", () => {
  const generateBtn = document.getElementById("generateBtn");
  const clearBtn = document.getElementById("clearBtn");
  const jobInput = document.getElementById("jobTitle");
  const companyInput = document.getElementById("companyName");
  const userNameInput = document.getElementById("userName");
  const toneSelect = document.getElementById("tone");
  const coverLetter = document.getElementById("coverLetter");
  const resultBox = document.getElementById("resultBox");
  const spinner = document.getElementById("spinner");
  const downloadBtn = document.getElementById("downloadBtn");
  const copyBtn = document.getElementById("copyBtn");

  // ✅ Generate letter
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

    generateBtn.disabled = true;
    generateBtn.textContent = "Generating...";
    spinner.classList.remove("hidden");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobTitle, companyName, userName, tone }),
      });

      const data = await res.json();
      if (data.coverLetter) {
        coverLetter.value = data.coverLetter;
        resultBox.classList.remove("hidden");
      } else {
        alert("Error generating cover letter. Try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Server error. Please try again.");
    } finally {
      spinner.classList.add("hidden");
      generateBtn.disabled = false;
      generateBtn.textContent = "Generate Your Letter";
    }
  });

  // ✅ Clear
  clearBtn.addEventListener("click", () => {
    jobInput.value = "";
    companyInput.value = "";
    userNameInput.value = "";
    toneSelect.selectedIndex = 0;
    coverLetter.value = "";
    resultBox.classList.add("hidden");
  });

  // ✅ Download
  downloadBtn.addEventListener("click", () => {
    const text = coverLetter.value.trim();
    if (!text) return alert("No cover letter to download.");

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 10;
    const maxWidth = pageWidth - margin * 2;

    pdf.setFont("times", "normal");
    pdf.setFontSize(12);
    pdf.text(text, margin, 20, { maxWidth, align: "left" });
    pdf.save("cover_letter.pdf");
  });

  // ✅ Copy
  copyBtn.addEventListener("click", () => {
    const text = coverLetter.value.trim();
    if (!text) return alert("Nothing to copy.");
    navigator.clipboard.writeText(text)
      .then(() => alert("✅ Cover letter copied to clipboard!"))
      .catch(() => alert("❌ Failed to copy text."));
  });
});

const form = document.querySelector("form");
const output = document.getElementById("output");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const jobTitle = document.querySelector("#jobTitle").value;
  const companyName = document.querySelector("#companyName").value;
  const userName = document.querySelector("#userName").value;
  const tone = document.querySelector("#tone").value;

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobTitle, companyName, userName, tone }),
    });

    if (!response.ok) throw new Error(`Server error: ${response.status}`);

    const data = await response.json();
    output.textContent = data.coverLetter;
  } catch (err) {
    console.error("❌ Error generating letter:", err);
    alert("Failed to generate letter. Please try again.");
  }
});

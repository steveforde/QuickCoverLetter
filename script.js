// Guard to avoid double-binding if the script is injected twice by cache
if (!window.__qcl_wired) {
  window.__qcl_wired = true;

  document.addEventListener("DOMContentLoaded", () => {
    const topCta = document.getElementById("topCta");          // scroll only
    const generateBtn = document.getElementById("generateBtn"); // generate ONLY
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

    // Top CTA: smooth scroll only — never starts spinner or fetch
    if (topCta) {
      topCta.addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("form")?.scrollIntoView({ behavior: "smooth" });
      });
    }

    // Generate handler
    generateBtn.addEventListener("click", async () => {
      const jobTitle = jobInput.value.trim();
      const companyName = companyInput.value.trim();
      const userName = userNameInput.value.trim();
      const tone = toneSelect.value;

      if (!jobTitle || !companyName) {
        alert("Please fill out both Job Title and Company Name.");
        return;
      }

      // UI: start
      generateBtn.disabled = true;
      generateBtn.textContent = "Generating...";
      spinner.classList.remove("hidden");

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobTitle, companyName, tone, userName }),
        });

        // If server error, surface it
        if (!res.ok) {
          const t = await res.text();
          throw new Error(`HTTP ${res.status}: ${t}`);
        }

        const data = await res.json();
        if (data && data.coverLetter) {
          coverLetter.value = data.coverLetter;
          resultBox.classList.remove("hidden");
          resultBox.scrollIntoView({ behavior: "smooth" });
        } else {
          alert("Error generating cover letter. Try again.");
        }
      } catch (err) {
        console.error("Generate failed:", err);
        alert("Server error. Please try again.");
      } finally {
        // UI: stop
        spinner.classList.add("hidden");
        generateBtn.disabled = false;
        generateBtn.textContent = "Generate Your Letter";
      }
    });

    // Clear
    clearBtn.addEventListener("click", () => {
      jobInput.value = "";
      companyInput.value = "";
      userNameInput.value = "";
      toneSelect.selectedIndex = 0;
      coverLetter.value = "";
      resultBox.classList.add("hidden");
    });

    // Download
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

    // Copy
    copyBtn.addEventListener("click", () => {
      const text = coverLetter.value.trim();
      if (!text) return alert("Nothing to copy.");
      navigator.clipboard.writeText(text)
        .then(() => alert("✅ Copied to clipboard"))
        .catch(() => alert("❌ Failed to copy"));
    });
  });
}


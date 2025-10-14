document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form');
  const spinner = document.getElementById('spinner');
  const resultBox = document.getElementById('resultBox');
  const coverLetter = document.getElementById('coverLetter');
  const clearBtn = document.getElementById('clearBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const copyBtn = document.getElementById('copyBtn');
  const toast = document.getElementById('toast');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    spinner.classList.remove('hidden');
    resultBox.classList.add('hidden');

    const jobTitle = document.getElementById('jobTitle').value;
    const companyName = document.getElementById('companyName').value;
    const userName = document.getElementById('userName').value;
    const tone = document.getElementById('tone').value;

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobTitle, companyName, userName, tone })
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      coverLetter.value = data.coverLetter || '⚠️ No letter generated.';
      spinner.classList.add('hidden');
      resultBox.classList.remove('hidden');
    } catch (err) {
      spinner.classList.add('hidden');
      alert('❌ Something went wrong. Check server logs.');
      console.error(err);
    }
  });

  clearBtn.addEventListener('click', () => {
    coverLetter.value = '';
    resultBox.classList.add('hidden');
  });

  downloadBtn.addEventListener("click", () => {
  const text = coverLetter.value.trim();
  let job = document.getElementById("jobTitle").value.trim();
  let company = document.getElementById("companyName").value.trim();

  if (!text) {
    showToast("⚠️ No cover letter to download", "error");
    return;
  }

  // 🧹 Clean and format names
  const formatName = (str) => {
    if (!str) return "";
    const capped = str.charAt(0).toUpperCase() + str.slice(1);
    return capped.replace(/\s+/g, "_").slice(0, 20); // limit length
  };

  const safeJob = formatName(job) || "Job";
  const safeCompany = formatName(company) || "Company";
  const fileName = `CoverLetter_${safeCompany}_${safeJob}.pdf`;

 const { jsPDF } = window.jspdf;
const pdf = new jsPDF({ unit: "mm", format: "a4" });

// Adjust margins to center content
const margin = 25; // try between 20–30
const startY = 30;
const maxWidth = pdf.internal.pageSize.getWidth() - margin * 2;

// ✨ Split and justify text
const lines = pdf.splitTextToSize(text, maxWidth);

pdf.setFont("times", "normal");
pdf.setFontSize(12);

// Justified text for each line
let y = startY;
lines.forEach(line => {
  pdf.text(line, margin, y, { maxWidth, align: "justify" });
  y += 7; // line spacing
});
pdf.save(fileName);
showToast(`📄 ${fileName} downloaded`, "success");
});




  copyBtn.addEventListener('click', () => {
  if (!coverLetter.value.trim()) return;
  navigator.clipboard.writeText(coverLetter.value)
    .then(() => {
      showToast('Copied to clipboard ✅', 'success');
    })
    .catch((err) => {
      console.error('Failed to copy: ', err);
      showToast('❌ Failed to copy', 'error');
    });
});

// ✅ Reusable toast function with type
function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.classList.remove('hidden', 'success', 'error');
  toast.classList.add(type);
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 2000);
}

});


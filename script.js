document.addEventListener('DOMContentLoaded', () => {
  const generateBtn = document.querySelector('.form-box .cta-button');
  const jobInput = document.getElementById('jobTitle');
  const companyInput = document.getElementById('companyName');
  const userNameInput = document.getElementById('userName');
  const toneSelect = document.getElementById('tone');
  const coverLetter = document.getElementById('coverLetter');
  const resultBox = document.getElementById('resultBox');
  const downloadBtn = document.getElementById('downloadBtn');
  const copyBtn = document.getElementById('copyBtn');

  // 🪄 Generate Cover Letter
  generateBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const jobTitle = jobInput.value.trim();
    const companyName = companyInput.value.trim();
    const userName = userNameInput.value.trim();
    const tone = toneSelect.value;

    if (!jobTitle || !companyName) {
      alert('Please fill out both Job Title and Company Name.');
      return;
    }

    // 🧹 Reset previous animation state if any
    resultBox.classList.remove('show');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobTitle, companyName, tone, userName }),
      });

      const data = await res.json();
      if (data.coverLetter) {
        coverLetter.value = data.coverLetter;
        resultBox.classList.remove('hidden');
        // ✨ Trigger fade-in animation
        setTimeout(() => resultBox.classList.add('show'), 10);
      } else {
        alert('Error generating cover letter. Try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Server error. Please try again.');
    }
  });

  // 📄 Download PDF
  downloadBtn.addEventListener('click', () => {
    const text = coverLetter.value.trim();
    if (!text) {
      alert('No cover letter to download.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 10;
    const maxWidth = pageWidth - margin * 2;

    pdf.setFont('times', 'normal');
    pdf.setFontSize(12);
    pdf.text(text, margin, 20, { maxWidth, align: 'left' });
    pdf.save('cover_letter.pdf');
  });

  // 📋 Copy to Clipboard
  copyBtn.addEventListener('click', () => {
    const text = coverLetter.value.trim();
    if (!text) {
      alert('Nothing to copy.');
      return;
    }

    navigator.clipboard.writeText(text)
      .then(() => alert('✅ Cover letter copied to clipboard!'))
      .catch(() => alert('❌ Failed to copy text.'));
  });
});

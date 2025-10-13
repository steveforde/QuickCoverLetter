document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form');
  const spinner = document.getElementById('spinner');
  const resultBox = document.getElementById('resultBox');
  const coverLetter = document.getElementById('coverLetter');
  const downloadBtn = document.getElementById('downloadBtn');
  const copyBtn = document.getElementById('copyBtn');
  const clearBtn = document.getElementById('clearBtn');

  // ✨ Handle Form Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    spinner.classList.remove('hidden');
    resultBox.classList.add('hidden');

    const jobTitle = document.getElementById('jobTitle').value.trim();
    const companyName = document.getElementById('companyName').value.trim();
    const userName = document.getElementById('userName').value.trim();
    const tone = document.getElementById('tone').value;

    if (!jobTitle || !companyName || !userName) {
      spinner.classList.add('hidden');
      alert('⚠️ Please fill out Job Title, Company Name, and Your Name.');
      return;
    }

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobTitle, companyName, userName, tone }),
      });

      if (!response.ok) throw new Error(`Server returned ${response.status}`);

      const data = await response.json();

      spinner.classList.add('hidden');
      resultBox.classList.remove('hidden');
      coverLetter.value = data.coverLetter || '⚠️ No letter generated';
    } catch (err) {
      spinner.classList.add('hidden');
      alert('❌ Error generating letter. Please try again.');
      console.error('❌ Error:', err);
    }
  });

  // 🧼 Clear Button
  clearBtn.addEventListener('click', () => {
    document.getElementById('jobTitle').value = '';
    document.getElementById('companyName').value = '';
    document.getElementById('userName').value = '';
    document.getElementById('tone').selectedIndex = 0;
    coverLetter.value = '';
    resultBox.classList.add('hidden');
  });

  // 📄 Download PDF
  downloadBtn.addEventListener('click', () => {
    const text = coverLetter.value.trim();
    if (!text) {
      alert('⚠️ No cover letter to download.');
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
      alert('⚠️ Nothing to copy.');
      return;
    }

    navigator.clipboard.writeText(text)
      .then(() => alert('✅ Cover letter copied to clipboard!'))
      .catch(() => alert('❌ Failed to copy text.'));
  });

  // 🧭 Scroll from top CTA button
  const topCta = document.getElementById('topCta');
  if (topCta) {
    topCta.addEventListener('click', (e) => {
      e.preventDefault();
      form.scrollIntoView({ behavior: 'smooth' });
    });
  }
});

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

  const { jsPDF } = window.jspdf;

  function drawJustifiedParagraph(pdf, text, x, y, maxWidth, lineHeight = 7) {
    const paragraphs = text.split(/\n\s*\n/);
    paragraphs.forEach(para => {
      const words = para.trim().split(/\s+/);
      let line = '';
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const testWidth = pdf.getTextWidth(testLine);
        if (testWidth > maxWidth && line !== '') {
          justifyLine(pdf, line.trim(), x, y, maxWidth);
          y += lineHeight;
          line = words[i] + ' ';
        } else {
          line = testLine;
        }
      }
      if (line.trim()) {
        pdf.text(line.trim(), x, y);
        y += lineHeight;
      }
      y += lineHeight;
    });
    return y;
  }

  function justifyLine(pdf, line, x, y, maxWidth) {
    const words = line.split(/\s+/);
    if (words.length === 1) {
      pdf.text(line, x, y);
      return;
    }
    const lineWidth = pdf.getTextWidth(line);
    const extraSpace = (maxWidth - lineWidth) / (words.length - 1);
    let cursorX = x;
    words.forEach((w, idx) => {
      pdf.text(w, cursorX, y);
      if (idx < words.length - 1) cursorX += pdf.getTextWidth(w + ' ') + extraSpace;
    });
  }

  function cleanLetterContent(text, userName) {
    // Start from "Dear"
    const dearIndex = text.search(/Dear/i);
    let cleaned = dearIndex !== -1 ? text.slice(dearIndex).trim() : text.trim();

    // Remove leftover placeholders like [Your Address]
    cleaned = cleaned.replace(/\[.*?\]/g, '').trim();

    // Remove any repeated “Hiring Manager ...” lines
    cleaned = cleaned.replace(/^(?:.*Hiring Manager.*\n)+/mi, '').trim();

    // Add signature if missing
    if (!/(Sincerely|Yours sincerely|Best regards)/i.test(cleaned)) {
      cleaned += `\n\nYours sincerely,\n${userName}`;
    }

    return cleaned;
  }

  downloadBtn.addEventListener('click', () => {
    let letterText = coverLetter.value.trim();
    if (!letterText) return;

    const jobTitle = document.getElementById('jobTitle').value || 'CoverLetter';
    const company = document.getElementById('companyName').value || 'Company';
    const userName = document.getElementById('userName').value || 'Your Name';

    const finalText = cleanLetterContent(letterText, userName);

    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    pdf.setFont('times', 'normal');
    pdf.setFontSize(12);

    const margin = 25;
    const maxWidth = pdf.internal.pageSize.getWidth() - margin * 2;
    let y = 30;

    // 📝 Letter Body (no address duplication)
    y = drawJustifiedParagraph(pdf, finalText, margin, y, maxWidth);

    // 💾 Save
    const fileName = `CoverLetter_${company}_${jobTitle}.pdf`;
    pdf.save(fileName);
    showToast(`📄 ${fileName} downloaded`, "success");
  });

  copyBtn.addEventListener('click', () => {
    if (!coverLetter.value.trim()) return;
    navigator.clipboard.writeText(coverLetter.value)
      .then(() => showToast('Copied to clipboard ✅', 'success'))
      .catch((err) => {
        console.error('Failed to copy: ', err);
        showToast('❌ Failed to copy', 'error');
      });
  });

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


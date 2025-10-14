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

function drawJustifiedText(pdf, text, x, y, maxWidth, lineHeight = 7) {
  const words = text.split(/\s+/);
  let line = '';
  let lineY = y;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const testWidth = pdf.getTextWidth(testLine);

    if (testWidth > maxWidth && line !== '') {
      const lineWords = line.trim().split(/\s+/);
      const gaps = lineWords.length - 1;

      if (gaps > 0) {
        const extraSpace = (maxWidth - pdf.getTextWidth(line.trim())) / gaps;
        let cursorX = x;
        lineWords.forEach((w, idx) => {
          pdf.text(w, cursorX, lineY);
          if (idx < gaps) cursorX += pdf.getTextWidth(w + ' ') + extraSpace;
        });
      } else {
        pdf.text(line.trim(), x, lineY);
      }

      line = words[i] + ' ';
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }

  // Render last line (left-aligned)
  pdf.text(line.trim(), x, lineY);
  return lineY + lineHeight;
}

document.getElementById('downloadBtn').addEventListener('click', () => {
  const text = document.getElementById('coverLetter').value;
  if (!text.trim()) return;

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  pdf.setFont('times', 'normal');
  pdf.setFontSize(12);

  const margin = 25;
  const maxWidth = pdf.internal.pageSize.getWidth() - margin * 2;
  const startY = 30;

  drawJustifiedText(pdf, text, margin, startY, maxWidth);

  const jobTitle = document.getElementById('jobTitle').value || 'CoverLetter';
  const company = document.getElementById('companyName').value || 'Company';
  const fileName = `CoverLetter_${company}_${jobTitle}.pdf`;

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


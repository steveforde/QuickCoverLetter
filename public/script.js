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

  // --- EXACT PDF RENDER (no edits, no auto headers, no auto signature) ---
const { jsPDF } = window.jspdf;

// Render the textarea exactly as-is, preserving blank lines.
// Only wraps long lines to fit the printable width.
function renderExact(pdf, text, x, y, maxWidth, lineHeight = 7) {
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = x; // we use x as the left margin

  // Normalize line endings, then iterate line-by-line
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  for (const rawLine of lines) {
    // Wrap this single logical line to the page width
    const chunks = rawLine.length
      ? pdf.splitTextToSize(rawLine, maxWidth)
      : [""]; // preserve blank lines

    for (const chunk of chunks) {
      // new page if we’re near the bottom
      if (y > pageH - margin) {
        pdf.addPage();
        y = margin;
      }

      if (chunk === "") {
        // blank line: just advance
        y += lineHeight;
      } else {
        pdf.text(chunk, x, y);
        y += lineHeight;
      }
    }
  }
  return y;
}

downloadBtn.addEventListener('click', () => {
  const letterText = coverLetter.value || '';
  if (!letterText.trim()) return;

  const jobTitle = (document.getElementById('jobTitle').value || 'CoverLetter').trim();
  const company  = (document.getElementById('companyName').value || 'Company').trim();

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  pdf.setFont('times', 'normal');
  pdf.setFontSize(12);

  const margin   = 20; // left/right/top/bottom visual margin
  const pageW    = pdf.internal.pageSize.getWidth();
  const maxWidth = pageW - margin * 2;
  let y          = margin;

  // Draw the textarea content verbatim
  renderExact(pdf, letterText, margin, y, maxWidth, 7);

  const safe = (s) => s.replace(/[^\w\-]+/g, '_');
  const fileName = `CoverLetter_${safe(company)}_${safe(jobTitle)}.pdf`;
  pdf.save(fileName);
  showToast(`📄 ${fileName} downloaded`, 'success');
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


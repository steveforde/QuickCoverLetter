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

  const { jsPDF } = window.jspdf;
const pdf = new jsPDF({ unit: "mm", format: "a4" });

const margin = 25;
const startY = 30;
const maxWidth = pdf.internal.pageSize.getWidth() - margin * 2;
pdf.setFont("times", "normal");
pdf.setFontSize(12);

function drawJustifiedText(text, x, y, maxWidth, lineHeight = 7) {
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

  // Last line (left aligned)
  pdf.text(line.trim(), x, lineY);
  return lineY + lineHeight;
}

// Example
const header = `[Your Name]
[Your Address]
[City, Zip]
[Email]
[Phone]
[Date]`;
const body = `I am writing to express my interest in the Computer Support role at Dell, as advertised. With a strong background in IT support and a commitment to providing exceptional customer service, I am excited about the opportunity to contribute to your team. In my previous role...`;

pdf.text(header, margin, startY);
drawJustifiedText(body, margin, startY + 40, maxWidth);

pdf.save("CoverLetter_Justified.pdf");

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


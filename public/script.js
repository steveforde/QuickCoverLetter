document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form');
  const spinner = document.getElementById('spinner');
  const resultBox = document.getElementById('resultBox');
  const coverLetter = document.getElementById('coverLetter');
  const clearBtn = document.getElementById('clearBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const copyBtn = document.getElementById('copyBtn');
  const toast = document.getElementById('toast');
  let isProUser = localStorage.getItem('hasPaid') === 'true'; // 🔧 NEW

  // === FOUR FULL LETTER TEMPLATES ===
  const templates = { /* ... your templates unchanged ... */ };

  // --- DISABLE TEMPLATE BUTTONS UNTIL PAYMENT IS CONFIRMED ---
  const templateButtons = document.querySelectorAll('.template-btn');

  // 🔧 NEW — Helper: add or remove lock icons visually
  function updateLockIcons() {
    templateButtons.forEach(btn => {
      const lockIcon = btn.querySelector('.lock-icon');
      if (!isProUser) {
        btn.disabled = true;
        btn.classList.add('locked');
        if (!lockIcon) {
          const icon = document.createElement('span');
          icon.classList.add('lock-icon');
          icon.textContent = ' 🔒';
          btn.appendChild(icon);
        }
      } else {
        btn.disabled = false;
        btn.classList.remove('locked');
        if (lockIcon) lockIcon.remove();
      }
    });
  }

  // Initial setup
  updateLockIcons();

  // Enable after payment
  if (isProUser) {
    showToast('✅ Payment confirmed — templates unlocked.', 'success', 4000);
    localStorage.removeItem('hasPaid');
  }

  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;

      const nameInput = document.getElementById('userName');
      const jobInput = document.getElementById('jobTitle');
      const companyInput = document.getElementById('companyName');

      // Validation
      if (!nameInput.value.trim()) {
        showToast('⚠️ Please enter your name before generating your letter.', 'error', 4000);
        nameInput.focus();
        return;
      }
      if (!jobInput.value.trim()) {
        showToast('⚠️ Please enter the job title.', 'error', 4000);
        jobInput.focus();
        return;
      }
      if (!companyInput.value.trim()) {
        showToast('⚠️ Please enter the company name.', 'error', 4000);
        companyInput.focus();
        return;
      }

      const name = nameInput.value.trim();
      const job = jobInput.value.trim();
      const company = companyInput.value.trim();
      const date = new Date().toLocaleDateString('en-IE', {
        day: 'numeric', month: 'long', year: 'numeric'
      });

      coverLetter.value = templates[type](name, job, company, date);
      resultBox.classList.remove('hidden');
      showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} letter loaded ✅`, 'info', 4000);
      setTimeout(() => {
        resultBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    });
  });

  // --- TOAST ---
  function showToast(message, type = 'success', duration = 4000) {
    if (!toast) return;
    toast.className = 'toast';
    toast.classList.add(type, 'show');
    toast.textContent = message;
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.classList.add('hidden'), 600);
    }, duration);
  }

  // --- STRIPE PAY BUTTON ---
  const payButton = document.getElementById('payButton');
  if (payButton) {
    payButton.addEventListener('click', async () => {
      try {
        const res = await fetch('/create-checkout-session', { method: 'POST' });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          alert('❌ Unable to start payment. Please try again.');
        }
      } catch (err) {
        console.error('Stripe payment error:', err);
        alert('⚠️ Payment setup failed.');
      }
    });
  }

  // --- PDF + COPY (unchanged) ---
  const { jsPDF } = window.jspdf;

  function renderExact(pdf, text, x, y, maxWidth, lineHeight = 7) {
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = x;
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    for (const rawLine of lines) {
      const chunks = rawLine.length ? pdf.splitTextToSize(rawLine, maxWidth) : [''];
      for (const chunk of chunks) {
        if (y > pageH - margin) {
          pdf.addPage();
          y = margin;
        }
        if (chunk === '') y += lineHeight;
        else {
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
    const company = (document.getElementById('companyName').value || 'Company').trim();

    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    pdf.setFont('times', 'normal');
    pdf.setFontSize(12);

    const margin = 20;
    const pageW = pdf.internal.pageSize.getWidth();
    const maxWidth = pageW - margin * 2;
    let y = margin;
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

 // === DARK MODE TOGGLE ===
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const savedTheme = localStorage.getItem('theme');

  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.body.classList.add('dark');
    themeToggle.textContent = '☀️';
  }

  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
}

// === LIVE SYSTEM THEME SYNC ===
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  const newTheme = e.matches ? 'dark' : 'light';
  document.body.classList.toggle('dark', newTheme === 'dark');
  localStorage.setItem('theme', newTheme);
  themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
});


  // --- CLEAR BUTTON ---
  clearBtn.addEventListener('click', () => {
    coverLetter.value = '';
    resultBox.classList.add('hidden');
    document.getElementById('jobTitle').value = '';
    document.getElementById('companyName').value = '';
    document.getElementById('userName').value = '';

    isProUser = localStorage.getItem('hasPaid') === 'true';
    updateLockIcons(); // 🔧 NEW — visually restore lock icons if needed

    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('🧹 Cleared successfully — ready to start fresh.', 'success', 4000);
  });
});

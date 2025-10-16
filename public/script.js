document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form');
  const spinner = document.getElementById('spinner');
  const resultBox = document.getElementById('resultBox');
  const coverLetter = document.getElementById('coverLetter');
  const clearBtn = document.getElementById('clearBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const copyBtn = document.getElementById('copyBtn');
  const toast = document.getElementById('toast');
  
  // --- Reset payment state on each fresh load ---
  localStorage.removeItem('hasPaid');

  // === FOUR FULL LETTER TEMPLATES ===
const templates = {
  professional: (name, job, company, date) => `
${name}
[Your Address]
[City, County]
${date}

Dear Hiring Manager,

I am writing to express my interest in the ${job} position at ${company}. With a strong background in delivering high-quality results and a commitment to professional excellence, I believe I can contribute effectively to your organisation’s goals.

Throughout my career, I have developed a reputation for reliability, attention to detail, and the ability to perform under pressure. I take pride in working collaboratively while maintaining accountability for my own responsibilities. My focus has always been on providing consistent, accurate, and professional outcomes that reflect well on both myself and the company I represent.

I am confident that my work ethic, adaptability, and communication skills will make me a valuable addition to your team. I am eager to bring my skills to ${company} and continue developing within a professional environment that values dedication and quality.

Thank you for your time and consideration. I would welcome the opportunity to discuss how I can contribute to your organisation’s success.

Sincerely,
${name}`,

  formal: (name, job, company, date) => `
${name}
[Your Address]
[City, County]
${date}

Dear Hiring Manager,

I wish to formally apply for the ${job} position with ${company}. I am a motivated and dependable individual who takes great care in upholding the highest standards of professionalism and integrity in all aspects of work.

Over the years, I have developed strong organisational skills and the ability to manage multiple priorities while maintaining accuracy and attention to detail. I take pride in being efficient, dependable, and committed to completing every task to the best of my ability.

I am particularly drawn to ${company} because of its commitment to excellence and customer satisfaction. I believe my background, combined with a strong sense of responsibility and respect for process, aligns well with your company’s culture.

Thank you for considering my application. I would appreciate the opportunity to meet and discuss how my skills and approach could add value to your team.

Yours faithfully,
${name}`,

  friendly: (name, job, company, date) => `
${name}
[Your Address]
[City, County]
${date}

Dear Hiring Manager,

I’m excited to apply for the ${job} role at ${company}. I’ve always believed that great results come from teamwork, clear communication, and genuine enthusiasm for what you do — values that I bring to every job I take on.

In previous roles, I’ve built strong relationships with colleagues and customers alike by being approachable, dependable, and eager to help. Whether solving problems, learning new systems, or supporting a busy team, I always aim to make a positive impact and create a friendly working atmosphere.

What attracts me most to ${company} is its reputation for quality and care. I’d love the opportunity to bring my energy and reliability to your team and contribute to your ongoing success.

Thank you for taking the time to review my application. I look forward to the chance to speak further about how I can help your company thrive.

Best regards,
${name}`,

  artistic: (name, job, company, date) => `
${name}
[Your Address]
[City, County]
${date}

Dear Hiring Manager,

I am reaching out to express my interest in the ${job} position at ${company}. Creativity, precision, and dedication are the principles that drive my work, and I believe they align perfectly with the innovative values your organisation represents.

Throughout my professional journey, I have developed a unique ability to blend creativity with structure. I take great pride in producing work that is both imaginative and refined, ensuring that every project I undertake reflects thought, care, and attention to detail.

I am inspired by ${company}’s forward-thinking approach and commitment to quality. Joining your team would give me the opportunity to contribute my ideas, artistic mindset, and disciplined work ethic toward meaningful, impactful results.

Thank you for considering my application. I would welcome the opportunity to bring my creative strengths and collaborative spirit to ${company}.

Warm regards,
${name}`
};

// --- DISABLE TEMPLATE BUTTONS UNTIL PAYMENT IS CONFIRMED ---
const templateButtons = document.querySelectorAll('.template-btn');

// Initially disable all template buttons
templateButtons.forEach(btn => btn.disabled = true);

// Check payment flag and unlock if set
if (localStorage.getItem('hasPaid') === 'true') {
  templateButtons.forEach(btn => btn.disabled = false);
  showToast('✅ Payment confirmed — templates unlocked.', 'success', 4000);
  // Once unlocked, clear the flag so it won’t falsely persist next time
  localStorage.removeItem('hasPaid');
}


document.querySelectorAll('.template-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.type;

    const nameInput = document.getElementById('userName');
    const jobInput = document.getElementById('jobTitle');
    const companyInput = document.getElementById('companyName');

    // Validation checks
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

    // Generate letter
    const name = nameInput.value.trim();
    const job = jobInput.value.trim();
    const company = companyInput.value.trim();
    const date = new Date().toLocaleDateString('en-IE', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    coverLetter.value = templates[type](name, job, company, date);
    resultBox.classList.remove('hidden');
    showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} letter loaded ✅`, 'info', 4000);
  });
});


  // --- UNIVERSAL TOAST FUNCTION ---
function showToast(message, type = 'success', duration = 4000) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.remove('hidden', 'success', 'error');
  toast.classList.add(type, 'show');

  // Hide toast after given duration
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
        window.location.href = data.url; // go to Stripe checkout
      } else {
        alert('❌ Unable to start payment. Please try again.');
      }
    } catch (err) {
      console.error('Stripe payment error:', err);
      alert('⚠️ Payment setup failed.');
    }
  });
}



 clearBtn.addEventListener('click', () => {
  coverLetter.value = '';
  resultBox.classList.add('hidden');

  // Disable Generate button again
  if (generateBtn) {
    generateBtn.disabled = true;
  }

  // Optional: toast feedback
  showToast('Form cleared — payment required to generate again.', 'info', 4000);
});


  // --- EXACT PDF RENDER (no auto headers or signature) ---
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

        if (chunk === '') {
          y += lineHeight;
        } else {
          pdf.text(chunk, x, y);
          y += lineHeight;
        }
      }
    }
    return y;
  }

  // --- DOWNLOAD PDF ---
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

  // --- COPY BUTTON ---
  copyBtn.addEventListener('click', () => {
    if (!coverLetter.value.trim()) return;
    navigator.clipboard.writeText(coverLetter.value)
      .then(() => showToast('Copied to clipboard ✅', 'success'))
      .catch((err) => {
        console.error('Failed to copy: ', err);
        showToast('❌ Failed to copy', 'error');
      });
  });
});

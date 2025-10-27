document.addEventListener('DOMContentLoaded', async () => {
  // === BASE CONFIG ===
  // If frontend and backend are on the same Render app:
  const BASE_URL = window.location.origin;
  // If they're separate, replace above with backend URL:
  // const BASE_URL = 'https://quickcoverletter-backend.onrender.com';

  const form = document.getElementById('form');
  const spinner = document.getElementById('spinner');
  const resultBox = document.getElementById('resultBox');
  const coverLetter = document.getElementById('coverLetter');
  const clearBtn = document.getElementById('clearBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const copyBtn = document.getElementById('copyBtn');
  const toast = document.getElementById('toast');
  const payButton = document.getElementById('payButton');
  let isProUser = localStorage.getItem('hasPaid') === 'true';

  // === LETTER TEMPLATES ===
  const templates = {
    professional(name, jobTitle, company, date) {
      return `${name}
[Your Address]
[City, County]
${date}

Dear Hiring Manager,

I am writing to apply for the ${jobTitle} position at ${company}. With a proven track record of delivering high-quality results and a strong commitment to professional excellence, I am confident in my ability to make a valuable contribution to your team.

Throughout my career, I have developed a reputation for reliability, attention to detail, and the ability to perform under pressure. I take pride in working collaboratively while maintaining accountability for my own responsibilities. My focus has always been on providing consistent, accurate, and professional outcomes that reflect well on both myself and the company I represent.

I am confident that my work ethic, adaptability, and communication skills will make me a valuable addition to your team. I am eager to bring my skills to ${company} and continue developing within a professional environment that values dedication and quality.

Thank you for taking the time to consider my application. I would be delighted to discuss how my background and work ethic align with the needs of ${company}.

Sincerely,
${name}`;
    },

    formal(name, jobTitle, company, date) {
      return `${name}
[Your Address]
[City, County]
${date}

Dear Hiring Manager,

I am writing to formally express my interest in the ${jobTitle} position at ${company}. With a consistent record of professionalism, reliability, and attention to detail, I take pride in maintaining the highest standards of performance in every role I undertake.

Throughout my career, I have developed strong organisational and communication skills, alongside the ability to manage multiple priorities with precision and care. I am known for my commitment to accuracy, dependability, and a methodical approach to achieving results.

I am particularly drawn to ${company} because of its reputation for excellence and its dedication to fostering a professional and supportive working environment. I believe my background, work ethic, and respect for process align closely with your company’s values.

Thank you for taking the time to consider my application. I would welcome the opportunity to discuss how my experience and dedication could contribute to the continued success of ${company}.

Yours faithfully,
${name}`;
    },

    friendly(name, jobTitle, company, date) {
      return `${name}
[Your Address]
[City, County]
${date}

Dear Hiring Manager,

I’m excited to apply for the ${jobTitle} position at ${company}. I’ve always believed that great results come from teamwork, clear communication, and a genuine passion for helping others — values I bring to every role I take on.

In my previous positions, I’ve developed a reputation for being approachable, dependable, and proactive. I take pride in supporting colleagues and customers alike, solving challenges with patience, positivity, and a can-do attitude. Whether assisting a busy team or managing day-to-day responsibilities, I strive to create a positive and productive working environment.

What stands out to me about ${company} is its commitment to quality, collaboration, and care — qualities I deeply value. I would love the opportunity to bring my enthusiasm and reliability to your team and play a part in ${company}’s continued success.

Thank you for taking the time to consider my application. I look forward to the opportunity to discuss how my approach and energy can contribute to your organisation.

Kind regards,
${name}`;
    },

    artistic(name, jobTitle, company, date) {
      return `${name}
[Your Address]
[City, County]
${date}

Dear Hiring Manager,

I’m excited to express my interest in the ${jobTitle} position at ${company}. My approach to work is guided by creativity, precision, and purpose — qualities that allow me to bring fresh ideas to life while maintaining a high standard of professionalism.

Throughout my career, I’ve honed the ability to balance imagination with structure. Whether developing concepts, solving visual challenges, or collaborating on campaigns, I take pride in producing work that is both innovative and thoughtfully executed. Every project I undertake is an opportunity to craft something meaningful and memorable.

What draws me to ${company} is its forward-thinking vision and commitment to creative excellence. I’m inspired by organisations that value originality and collaboration, and I’m eager to contribute my ideas, design sense, and dedication to ${company}’s continued growth and success.

Thank you for considering my application. I would welcome the opportunity to discuss how my creative perspective and professional discipline can add value to your team.

Warm regards,
${name}`;
    },
  };

  // === GENERATE LETTER ===
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const jobTitle = document.getElementById('jobTitle').value;
    const companyName = document.getElementById('companyName').value;
    const tone = document.getElementById('tone')?.value || 'professional';
    const name = document.getElementById('userName').value;

    spinner.classList.remove('hidden');
    try {
      const res = await fetch(`${BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobTitle, companyName, tone, name }),
      });
      const data = await res.json();
      spinner.classList.add('hidden');
      coverLetter.value = data.error || data.letter || 'No letter generated.';
      resultBox.classList.remove('hidden');
    } catch (err) {
      spinner.classList.add('hidden');
      console.error('⚠️ Generate error:', err);
      showToast('⚠️ Failed to connect to server.', 'error');
    }
  });

  // === STRIPE PAY BUTTON ===
  if (payButton) {
    payButton.addEventListener('click', async () => {
      console.log('✅ Pay button clicked');
      try {
        const res = await fetch(`${BASE_URL}/create-checkout-session`, {
          method: 'POST',
        });

        if (!res.ok) {
          throw new Error(`Server responded with ${res.status}`);
        }

        const data = await res.json();
        console.log('📡 Stripe response:', data);

        if (data.url) {
          window.location.href = data.url;
        } else {
          console.error('❌ No URL in Stripe response', data);
          showToast('❌ Unable to start payment. Please try again.', 'error');
        }
      } catch (err) {
        console.error('Stripe payment error:', err);
        showToast('⚠️ Payment setup failed. Check console.', 'error');
      }
    });
  }

  // === TEMPLATE BUTTONS (LOCKED UNTIL PAYMENT) ===
  const templateButtons = document.querySelectorAll('.template-btn');
  function updateLockIcons() {
    templateButtons.forEach((btn) => {
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
  updateLockIcons();

  // === TOAST ===
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

  // === PDF DOWNLOAD ===
  const { jsPDF } = window.jspdf;
  function renderExact(pdf, text, x, y, maxWidth, lineHeight = 7) {
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = x;
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    for (const rawLine of lines) {
      const chunks = rawLine.length
        ? pdf.splitTextToSize(rawLine, maxWidth)
        : [''];
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
    const jobTitle = (
      document.getElementById('jobTitle').value || 'CoverLetter'
    ).trim();
    const company = (
      document.getElementById('companyName').value || 'Company'
    ).trim();

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
    navigator.clipboard
      .writeText(coverLetter.value)
      .then(() => showToast('Copied to clipboard ✅', 'success'))
      .catch((err) => {
        console.error('Failed to copy: ', err);
        showToast('❌ Failed to copy', 'error');
      });
  });

  // === THEME TOGGLE ===
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;
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

  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', (e) => {
      const newTheme = e.matches ? 'dark' : 'light';
      document.body.classList.toggle('dark', newTheme === 'dark');
      localStorage.setItem('theme', newTheme);
      themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });

  // === CLEAR ===
  clearBtn.addEventListener('click', () => {
    coverLetter.value = '';
    resultBox.classList.add('hidden');
    document.getElementById('jobTitle').value = '';
    document.getElementById('companyName').value = '';
    document.getElementById('userName').value = '';
    isProUser = localStorage.getItem('hasPaid') === 'true';
    updateLockIcons();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(
      '🧹 Cleared successfully — ready to start fresh.',
      'success',
      4000
    );
  });
});

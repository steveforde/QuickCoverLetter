import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// =========================================================================
// 🔑 SUPABASE CONFIGURATION (MANDATORY)
// These global variables (__SUPABASE_URL and __SUPABASE_ANON_KEY) are
// automatically provided by the Canvas environment for client-side use.
// =========================================================================

let supabase = null;

if (typeof __SUPABASE_URL === 'undefined' || typeof __SUPABASE_ANON_KEY === 'undefined') {
    console.error("CONFIGURATION ERROR: Supabase environment variables (__SUPABASE_URL or __SUPABASE_ANON_KEY) are not defined. App features relying on Supabase will be non-functional.");
    // Supabase will remain null, leading to payment check failure, which is safer than using dummy credentials.
} else {
    // Initialize Supabase Client using provided global variables
    const SUPABASE_URL = __SUPABASE_URL;
    const SUPABASE_ANON_KEY = __SUPABASE_ANON_KEY;
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form');
  const spinner = document.getElementById('spinner');
  const resultBox = document.getElementById('resultBox');
  const coverLetter = document.getElementById('coverLetter');
  const clearBtn = document.getElementById('clearBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const copyBtn = document.getElementById('copyBtn');
  const toast = document.getElementById('toast');
  const payButton = document.getElementById('payButton');
  
  // Set initial state to FREE (locked)
  let isProUser = false; 


 // === FOUR FULL LETTER TEMPLATES ===
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

Warm regards,
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
  }
};


  // --- SUPABASE PAYMENT CHECKER ---
  // Checks if the user's email exists in the 'transactions' table with status 'paid'
  async function checkSupabasePayment(email) {
    if (!supabase) {
        // If supabase is null due to missing env vars, immediately fail
        console.error("Cannot check payment: Supabase client is not initialized.");
        return false;
    }

    if (!email || !email.includes('@')) {
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id') // Only select the ID for minimal data transfer
        .eq('email', email)
        .eq('status', 'paid')
        .limit(1);

      if (error) {
        console.error('Supabase check error:', error.message);
        return false;
      }
      
      // Returns true if a paid record is found
      return data && data.length > 0;

    } catch (e) {
      console.error('General Supabase fetch error:', e);
      return false;
    }
  }


  // --- DISABLE TEMPLATE BUTTONS UNTIL PAYMENT IS CONFIRMED ---
  const templateButtons = document.querySelectorAll('.template-btn');

  // Helper: add or remove lock icons visually
  function updateLockIcons() {
    templateButtons.forEach(btn => {
      const lockIcon = btn.querySelector('.lock-icon');
      if (!isProUser) {
        btn.disabled = true;
        payButton.classList.remove('hidden'); // Show pay button when locked
        btn.classList.add('locked');
        if (!lockIcon) {
          const icon = document.createElement('span');
          icon.classList.add('lock-icon');
          icon.textContent = ' 🔒';
          btn.appendChild(icon);
        }
      } else {
        btn.disabled = false;
        payButton.classList.add('hidden'); // Hide pay button when unlocked
        btn.classList.remove('locked');
        if (lockIcon) lockIcon.remove();
      }
    });
    
    if (isProUser) {
        showToast('✅ Templates unlocked!', 'success', 3000);
    } else {
        // Only show a warning if Supabase is actually initialized
        if (supabase) {
            showToast('🔒 Templates are locked. Purchase to unlock.', 'error', 3000);
        }
    }
  }
  
  // New: Check status based on email input when the user changes focus
  async function handleEmailInputBlur() {
    // This assumes the email input field has the ID 'userEmail'
    const emailInput = document.getElementById('userEmail'); 
    const email = emailInput ? emailInput.value.trim() : '';

    if (email && email.includes('@')) {
        isProUser = await checkSupabasePayment(email);
    } else {
        // If the field is empty or invalid, assume they are locked
        isProUser = false;
    }
    updateLockIcons();
  }
  
  // Add listener to the email input field (assuming you have one with ID 'userEmail')
  const emailField = document.getElementById('userEmail'); 
  if (emailField) {
      emailField.addEventListener('blur', handleEmailInputBlur);
  }
  
  // Fallback: Check status on successful payment redirect (or page load if email is pre-filled)
  // This is a simple initial check, the 'blur' event handles live updates.
  handleEmailInputBlur(); 

  // Initial setup: Lock buttons by default
  updateLockIcons();


  document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // 🚨 CRITICAL CHECK: Prevent generation if locked
      if (!isProUser) {
        showToast('❌ Purchase required to use templates.', 'error', 4000);
        return;
      }
      
      // Remove 'active' class from all, then add to the clicked one
      document.querySelectorAll('.template-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const type = btn.dataset.type;

      // NOTE: Assuming the input fields for name, job, and company are present
      const nameInput = document.getElementById('userName'); 
      const jobInput = document.getElementById('jobTitle');
      const companyInput = document.getElementById('companyName');

      // Validation
      if (!nameInput || !nameInput.value.trim()) { // Check if element exists and value is present
        showToast('⚠️ Please enter your name before generating your letter.', 'error', 4000);
        // Fallback focus since 'userName' might not exist
        if (nameInput) nameInput.focus();
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
    // Use a simpler class for coloring based on type
    const baseClass = type === 'error' ? 'error' : (type === 'success' ? 'success' : 'info'); 
    toast.classList.add(baseClass, 'show');
    toast.textContent = message;
    
    // Auto-hide the toast
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.classList.add('hidden'), 600);
    }, duration);
    
    // Ensure toast is visible by removing 'hidden' if it was present
    toast.classList.remove('hidden');
  }

  // --- STRIPE PAY BUTTON ---
  if (payButton) {
    payButton.addEventListener('click', async () => {
      // Must grab the email from the form to send to the backend
      const emailInput = document.getElementById('userEmail'); 
      const email = emailInput ? emailInput.value.trim() : '';

      if (!email || !email.includes('@')) {
          showToast('⚠️ Please enter your email in the dedicated field before paying.', 'error', 5000);
          if (emailInput) emailInput.focus();
          return;
      }
      
      try {
        const res = await fetch('/create-checkout-session', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }) // Send the email to the server
        });
        
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          // Check for specific error message from the server
          const errorMessage = data.error || 'Unable to start payment. Please try again.';
          showToast(`❌ ${errorMessage}`, 'error');
        }
      } catch (err) {
        console.error('Stripe payment error:', err);
        showToast('⚠️ Payment setup failed.', 'error');
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
    // Using modern clipboard API which is generally preferred
    navigator.clipboard.writeText(coverLetter.value)
      .then(() => showToast('Copied to clipboard ✅', 'success'))
      .catch((err) => {
        console.error('Failed to copy: ', err);
        // Fallback for environments where clipboard.writeText might fail
        try {
            const tempInput = document.createElement('textarea');
            tempInput.value = coverLetter.value;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            showToast('Copied to clipboard (fallback) ✅', 'success');
        } catch (execErr) {
            console.error('Fallback copy failed: ', execErr);
            showToast('❌ Failed to copy', 'error');
        }
      });
  });

 // === DARK MODE TOGGLE (unchanged) ===
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const savedTheme = localStorage.getItem('theme');

  // Check saved theme first, then system preference
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.body.classList.add('dark-mode'); // Use 'dark-mode' class to match CSS
    themeToggle.textContent = '☀️';
  } else {
    // Ensure the text is set for light mode if it starts that way
    themeToggle.textContent = '🌙';
  }

  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
}

// === LIVE SYSTEM THEME SYNC (FIXED: now uses 'dark-mode' class) ===
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  if (!localStorage.getItem('theme')) { // Only sync if user hasn't manually set a preference
    const newTheme = e.matches ? 'dark' : 'light';
    document.body.classList.toggle('dark-mode', newTheme === 'dark');
    themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
  }
});


  // --- CLEAR BUTTON (FIXED) ---
  clearBtn.addEventListener('click', () => {
    coverLetter.value = '';
    resultBox.classList.add('hidden');
    document.getElementById('jobTitle').value = '';
    document.getElementById('companyName').value = '';
    
    // Clear the email field
    const emailField = document.getElementById('userEmail');
    if (emailField) {
        emailField.value = '';
    }
    
    // Clear the user name field
    const userNameField = document.getElementById('userName'); 
    if (userNameField) {
        userNameField.value = '';
    }
    
    // Deselect active template button
    document.querySelectorAll('.template-btn').forEach(b => b.classList.remove('active'));

    // ✅ FIX: Reset the global state and visually re-lock the buttons
    isProUser = false; 
    updateLockIcons(); 

    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('🧹 Cleared successfully — ready to start fresh.', 'success', 4000);
  });
});

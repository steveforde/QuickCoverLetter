// ===== Scroll to form section smoothly =====
document.addEventListener('DOMContentLoaded', () => {
  const ctaButton = document.querySelector('.top-cta');
  const formSection = document.querySelector('#form');

  if (ctaButton && formSection) {
    ctaButton.addEventListener('click', (e) => {
      e.preventDefault();
      formSection.scrollIntoView({ behavior: 'smooth' });
    });
  }
});

// ===== Generate Cover Letter =====
document.addEventListener('DOMContentLoaded', () => {
  const generateBtn = document.querySelector('.form-box .cta-button');
  const jobInput = document.getElementById('jobTitle');
  const companyInput = document.getElementById('companyName');
  const toneSelect = document.getElementById('tone');
  const resultBox = document.getElementById('resultBox');
  const coverLetter = document.getElementById('coverLetter');

  generateBtn.addEventListener('click', (e) => {
    e.preventDefault();

    const job = jobInput.value.trim();
    const company = companyInput.value.trim();
    const tone = toneSelect.value;

    if (!job || !company) {
      alert('Please fill out both Job Title and Company Name.');
      return;
    }

    const letter = `Dear Hiring Manager,\n\nI’m excited to apply for the ${job} role at ${company}. With my background in customer success and IT support, I’m confident I can make a meaningful contribution to your team.\n\nI look forward to the opportunity to discuss how my skills align with your company’s goals.\n\nBest regards,\nStephen Forde`;

    coverLetter.value = letter;
    resultBox.classList.remove('hidden');
  });
});

// ===== Copy Button =====
document.getElementById('copyBtn').addEventListener('click', () => {
  const text = document.getElementById('coverLetter');
  text.select();
  document.execCommand('copy');
  alert('✅ Cover letter copied to clipboard!');
});

// ===== Download Button =====
document.getElementById('downloadBtn').addEventListener('click', () => {
  const letterText = document.getElementById('coverLetter').value;
  const blob = new Blob([letterText], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'cover_letter.txt';
  link.click();
});

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
  const nameInput = document.getElementById('userName');
  const toneSelect = document.getElementById('tone');
  const resultBox = document.getElementById('resultBox');
  const coverLetter = document.getElementById('coverLetter');

  generateBtn.addEventListener('click', (e) => {
    e.preventDefault();

    const job = jobInput.value.trim();
    const company = companyInput.value.trim();
    const name = nameInput.value.trim();
    const tone = toneSelect.value;

    if (!job || !company || !name) {
      alert('Please fill out Job Title, Company Name, and Your Name.');
      return;
    }

    const letter = `Dear Hiring Manager,\n\nI’m excited to apply for the ${job} role at ${company}. With my background in customer success and IT support, I’m confident I can make a meaningful contribution to your team.\n\nI look forward to the opportunity to discuss how my skills align with your company’s goals.\n\nBest regards,\n${name}`;

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

// ===== Download Button (Formatted PDF) =====
document.getElementById('downloadBtn').addEventListener('click', () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const letterText = document.getElementById('coverLetter').value;
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  const title = 'Cover Letter';
  const titleWidth = doc.getTextWidth(title);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(title, (pageWidth - titleWidth) / 2, 20);

  // Body
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(12);
  const splitText = doc.splitTextToSize(letterText, 180);
  doc.text(splitText, 15, 40);

  doc.save('cover_letter.pdf');
});

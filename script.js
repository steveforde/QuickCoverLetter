document.getElementById('generateBtn').addEventListener('click', () => {
  const jobTitle = document.getElementById('jobTitle').value.trim();
  const companyName = document.getElementById('companyName').value.trim();
  const tone = document.getElementById('tone').value;
  const resultBox = document.getElementById('resultBox');
  const coverLetter = document.getElementById('coverLetter');

  if (!jobTitle || !companyName) {
    alert('Please fill in both fields.');
    return;
  }

  // Placeholder letter (AI integration will replace this)
  const example = `Dear Hiring Manager,\n\nI’m excited to apply for the ${jobTitle} position at ${companyName}. With strong communication skills and a results-driven mindset, I’m eager to contribute to your team and help achieve outstanding results.\n\nKind regards,\n[Your Name]`;

  coverLetter.value = example;
  resultBox.classList.remove('hidden');
});

document.getElementById('copyBtn').addEventListener('click', () => {
  const text = document.getElementById('coverLetter');
  text.select();
  document.execCommand('copy');
  alert('Cover letter copied to clipboard!');
});

document.getElementById('downloadBtn').addEventListener('click', () => {
  const letterText = document.getElementById('coverLetter').value;
  const blob = new Blob([letterText], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'cover_letter.txt';
  link.click();
});

document.addEventListener('DOMContentLoaded', () => {
  const ctaButton = document.querySelector('.cta-button'); // or your actual button class/id
  const formSection = document.querySelector('#form'); // replace with your actual form section id

  if (ctaButton && formSection) {
    ctaButton.addEventListener('click', (e) => {
      e.preventDefault();
      formSection.scrollIntoView({ behavior: 'smooth' });
    });
  }
});

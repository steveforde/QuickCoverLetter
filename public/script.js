document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('coverForm');
  const spinner = document.getElementById('spinner');
  const resultBox = document.getElementById('resultBox');
  const coverLetter = document.getElementById('coverLetter');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    spinner.classList.remove('hidden');
    resultBox.classList.add('hidden');

    const jobTitle = document.getElementById('jobTitle').value.trim();
    const companyName = document.getElementById('companyName').value.trim();
    const userName = document.getElementById('userName').value.trim();
    const tone = document.getElementById('tone').value;

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobTitle, companyName, userName, tone })
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();

      spinner.classList.add('hidden');
      resultBox.classList.remove('hidden');
      coverLetter.value = data.coverLetter || '⚠️ No letter generated';
    } catch (err) {
      spinner.classList.add('hidden');
      alert('❌ Failed to generate letter. Check backend.');
      console.error(err);
    }
  });
});

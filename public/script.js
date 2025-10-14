document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form');
  const jobTitle = document.getElementById('jobTitle');
  const companyName = document.getElementById('companyName');
  const userName = document.getElementById('userName');
  const tone = document.getElementById('tone');
  const spinner = document.getElementById('spinner');
  const resultBox = document.getElementById('resultBox');
  const coverLetter = document.getElementById('coverLetter');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    spinner.classList.remove('hidden');
    resultBox.classList.add('hidden');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: jobTitle.value,
          companyName: companyName.value,
          userName: userName.value,
          tone: tone.value
        })
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      spinner.classList.add('hidden');
      resultBox.classList.remove('hidden');
      coverLetter.value = data.coverLetter || '⚠️ No letter generated.';
    } catch (err) {
      spinner.classList.add('hidden');
      alert('❌ Something went wrong. Check server logs.');
      console.error(err);
    }
  });

  // Optional — clear button logic
  const clearBtn = document.getElementById('clearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      coverLetter.value = '';
      resultBox.classList.add('hidden');
    });
  }
});

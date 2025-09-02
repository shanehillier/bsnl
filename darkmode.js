const toggleBtn = document.getElementById('mode-toggle');
const savedMode = localStorage.getItem('theme');

// apply saved mode
if (savedMode === 'dark') {
    document.body.classList.add('dark-mode');
    toggleBtn.textContent = '☀️';
}

toggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    toggleBtn.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
});

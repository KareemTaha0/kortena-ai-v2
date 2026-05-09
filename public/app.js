document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn').addEventListener('click', analyze);
  document.getElementById('copyBtn').addEventListener('click', copyResults);
  document.getElementById('inputText').addEventListener('input', updateCount);
});

const history = [];

function updateCount() {
  const text = document.getElementById('inputText').value.trim();
  const count = text === '' ? 0 : text.split(/\s+/).length;
  document.getElementById('wordCount').textContent = count + ' word' + (count !== 1 ? 's' : '');
}

function animateCircle(score) {
  const circle = document.getElementById('clarityCircle');
  const circumference = 201;
  const offset = circumference - (score / 100) * circumference;
  circle.style.transition = 'stroke-dashoffset 1s ease';
  circle.style.strokeDashoffset = offset;

  // Color based on score
  if (score >= 70) circle.style.stroke = '#4caf82';
  else if (score >= 40) circle.style.stroke = '#f0a500';
  else circle.style.stroke = '#e05555';
}

function animateValue(id, value, suffix = '') {
  const el = document.getElementById(id);
  let start = 0;
  const end = parseInt(value);
  const duration = 800;
  const step = Math.ceil(end / (duration / 16));
  const timer = setInterval(() => {
    start += step;
    if (start >= end) {
      el.textContent = end + suffix;
      clearInterval(timer);
    } else {
      el.textContent = start + suffix;
    }
  }, 16);
}

async function analyze() {
  const text = document.getElementById('inputText').value;
  if (!text) return alert('Please enter some text');

  const btn = document.getElementById('btn');
  btn.textContent = 'Analyzing...';
  btn.classList.add('loading');

  try {
    const res = await fetch('/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    const data = await res.json();
    if (data.error) { alert(data.error); return; }

    const top = data.sentiment.sort((a, b) => b.score - a.score)[0];
    const sentiment = top.label.toLowerCase();
    const sentimentScore = Math.round(top.score * 10);

    // Animate scores
    animateValue('sentiment_score', sentimentScore, '/10');
    document.getElementById('clarity_score').textContent = data.clarityScore;
    animateCircle(data.clarityScore);

    const badge = document.getElementById('sentiment_badge');
    badge.textContent = sentiment;
    badge.className = 'sentiment-badge ' + (sentiment === 'positive' ? 'positive' : 'negative');

    // Tags
    const tagsEl = document.getElementById('tags');
    tagsEl.innerHTML = '';
    (data.tags || []).forEach(tag => {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = tag;
      tagsEl.appendChild(span);
    });

    // Suggestions
    const ul = document.getElementById('suggestions');
    ul.innerHTML = '';
    data.suggestions.forEach((s, i) => {
      const li = document.createElement('li');
      li.textContent = s;
      li.style.animationDelay = `${i * 0.1}s`;
      li.classList.add('fade-in');
      ul.appendChild(li);
    });

    document.getElementById('summary').textContent = `The text has a ${sentiment} sentiment with ${data.clarityScore}/100 clarity score.`;

    const results = document.getElementById('results');
    results.style.display = 'block';
    results.classList.add('fade-in');

    // History
    history.unshift({ text, sentiment, sentimentScore, clarityScore: data.clarityScore });
    if (history.length > 3) history.pop();
    renderHistory();

  } catch (err) {
    alert('Something went wrong. Please try again.');
  } finally {
    btn.textContent = 'Analyze';
    btn.classList.remove('loading');
  }
}

function renderHistory() {
  if (history.length === 0) return;
  document.getElementById('historySection').style.display = 'block';
  const list = document.getElementById('historyList');
  list.innerHTML = '';
  history.forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <div class="h-text">${item.text.substring(0, 80)}${item.text.length > 80 ? '...' : ''}</div>
      <div class="h-meta">
        <span class="h-badge">${item.sentiment}</span>
        <span class="h-badge">sentiment ${item.sentimentScore}/10</span>
        <span class="h-badge">clarity ${item.clarityScore}/100</span>
      </div>
    `;
    div.addEventListener('click', () => {
      document.getElementById('inputText').value = item.text;
      updateCount();
    });
    list.appendChild(div);
  });
}

function copyResults() {
  const sentiment = document.getElementById('sentiment_badge').textContent;
  const sentimentScore = document.getElementById('sentiment_score').textContent;
  const clarityScore = document.getElementById('clarity_score').textContent;
  const summary = document.getElementById('summary').textContent;

  const suggestions = [];
  document.querySelectorAll('#suggestions li').forEach(li => suggestions.push(li.textContent));

  const result = `
Sentiment: ${sentiment} (${sentimentScore})
Clarity: ${clarityScore}/100
Summary: ${summary}
Suggestions:
${suggestions.map(s => '- ' + s).join('\n')}
  `.trim();

  navigator.clipboard.writeText(result);
  document.getElementById('copyBtn').textContent = 'Copied!';
  setTimeout(() => {
    document.getElementById('copyBtn').textContent = 'Copy Results';
  }, 2000);
}
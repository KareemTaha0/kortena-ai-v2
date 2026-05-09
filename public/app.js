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

async function analyze() {
  const text = document.getElementById('inputText').value;
  if (!text) return alert('Please enter some text');

  const btn = document.getElementById('btn');
  btn.textContent = 'Analyzing...';
  btn.classList.add('loading');

  const res = await fetch('/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });

  const data = await res.json();

  const top = data.sentiment.sort((a, b) => b.score - a.score)[0];
  const sentiment = top.label.toLowerCase();

  const sentimentScore = Math.round(top.score * 10);
  const words = text.trim().split(/\s+/);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgWords = words.length / Math.max(sentences.length, 1);
  const clarityScore = Math.min(10, Math.max(1, Math.round(10 - (avgWords > 20 ? (avgWords - 20) * 0.3 : 0) - (words.length < 10 ? 3 : 0))));

  document.getElementById('sentiment_score').textContent = sentimentScore + '/10';
  document.getElementById('clarity_score').textContent = clarityScore + '/10';

  const badge = document.getElementById('sentiment_badge');
  badge.textContent = sentiment;
  badge.className = 'sentiment-badge ' + (sentiment === 'positive' ? 'positive' : 'negative');

  document.getElementById('summary').textContent = `The text has a ${sentiment} sentiment with a confidence of ${Math.round(top.score * 100)}%.`;

  const ul = document.getElementById('suggestions');
  ul.innerHTML = '';
  data.suggestions.forEach(s => {
    const li = document.createElement('li');
    li.textContent = s;
    ul.appendChild(li);
  });

  document.getElementById('results').style.display = 'block';
  btn.textContent = 'Analyze';
  btn.classList.remove('loading');

  history.unshift({ text, sentiment, sentimentScore, clarityScore });
  if (history.length > 3) history.pop();
  renderHistory();
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
        <span class="h-badge">clarity ${item.clarityScore}/10</span>
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
  document.querySelectorAll('#suggestions li').forEach(li => {
    suggestions.push(li.textContent);
  });

  const result = `
Sentiment: ${sentiment} (${sentimentScore})
Clarity: ${clarityScore}
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
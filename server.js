require('dotenv').config();
const express = require('express');
const { HfInference } = require('@huggingface/inference');
const app = express();

app.use(express.json());
app.use(express.static('public', { index: false }));

const hf = new HfInference(process.env.HF_API_KEY);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/analyze', (req, res) => {
  res.sendFile(__dirname + '/public/analyzer.html');
});

app.post('/analyze', async (req, res) => {
  const { text } = req.body;
  try {
    const sentiment = await hf.textClassification({
      model: 'distilbert/distilbert-base-uncased-finetuned-sst-2-english',
      inputs: text
    });

    const suggestions = [];
    const words = text.trim().split(/\s+/);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWords = words.length / Math.max(sentences.length, 1);
    const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;
    const vocabularyRichness = uniqueWords / words.length;
    const hasPassiveVoice = /\b(is|are|was|were|be|been|being)\s+\w+ed\b/i.test(text);
    const hasFillerWords = /\b(very|really|just|basically|literally|actually|honestly)\b/i.test(text);
    const topSentiment = sentiment.sort((a, b) => b.score - a.score)[0];
    const isNegative = topSentiment.label === 'NEGATIVE';
    const hasExclamation = (text.match(/!/g) || []).length > 2;
    const hasQuestions = (text.match(/\?/g) || []).length > 0;

    if (words.length < 15) suggestions.push("Your text is too short — add more context and detail to make your point stronger.");
    if (avgWords > 25) suggestions.push(`Your sentences average ${Math.round(avgWords)} words — try splitting them into shorter ones.`);
    if (hasPassiveVoice) suggestions.push("You're using passive voice — switch to active voice to sound more confident.");
    if (hasFillerWords) suggestions.push("Remove filler words like 'very', 'really', or 'just' — they weaken your message.");
    if (vocabularyRichness < 0.5 && words.length > 20) suggestions.push("You're repeating words too often — try using more varied vocabulary.");
    if (isNegative) suggestions.push("Your text has a negative tone — consider reframing more positively if appropriate.");
    if (hasExclamation) suggestions.push("Too many exclamation marks — limit to one for a more professional tone.");
    if (!text.match(/[.!?]$/)) suggestions.push("Your text doesn't end with punctuation — always close your sentences properly.");
    if (text === text.toLowerCase()) suggestions.push("Use proper capitalization — start sentences with capital letters.");
    if (hasQuestions && sentences.length < 3) suggestions.push("Add more context before posing your question.");
    if (suggestions.length < 3) suggestions.push("Try structuring your text with a clear opening, middle, and conclusion.");

    res.json({ sentiment, suggestions: suggestions.slice(0, 3) });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Running on http://localhost:3000'));
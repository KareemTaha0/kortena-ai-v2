require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { HfInference } = require('@huggingface/inference');
const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"]
    }
  }
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests — please try again later.' }
});
app.use('/analyze', limiter);

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

  if (!text || typeof text !== 'string') return res.status(400).json({ error: 'Invalid input.' });
  if (text.trim().length === 0) return res.status(400).json({ error: 'Text cannot be empty.' });
  if (text.length > 2000) return res.status(400).json({ error: 'Text too long — max 2000 characters.' });

  try {
    const sentiment = await hf.textClassification({
      model: 'distilbert/distilbert-base-uncased-finetuned-sst-2-english',
      inputs: text
    });

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

    // Improved clarity score (0-100)
    let clarityScore = 100;
    if (avgWords > 20) clarityScore -= Math.min(30, (avgWords - 20) * 2);
    if (words.length < 15) clarityScore -= 20;
    if (vocabularyRichness < 0.5 && words.length > 20) clarityScore -= 15;
    if (hasPassiveVoice) clarityScore -= 10;
    if (hasFillerWords) clarityScore -= 5;
    if (!text.match(/[.!?]$/)) clarityScore -= 5;
    if (text === text.toLowerCase()) clarityScore -= 5;
    clarityScore = Math.max(0, Math.min(100, Math.round(clarityScore)));

    const suggestions = [];
    if (words.length < 15) suggestions.push("Your text is too short — add more context and detail.");
    if (avgWords > 25) suggestions.push(`Sentences average ${Math.round(avgWords)} words — try splitting them up.`);
    if (hasPassiveVoice) suggestions.push("Switch from passive to active voice for more confidence.");
    if (hasFillerWords) suggestions.push("Remove filler words like 'very', 'really', or 'just'.");
    if (vocabularyRichness < 0.5 && words.length > 20) suggestions.push("Too much repetition — use more varied vocabulary.");
    if (isNegative) suggestions.push("Negative tone detected — consider reframing more positively.");
    if (hasExclamation) suggestions.push("Too many exclamation marks — limit to one for professionalism.");
    if (!text.match(/[.!?]$/)) suggestions.push("End your text with proper punctuation.");
    if (text === text.toLowerCase()) suggestions.push("Use proper capitalization — start sentences with capitals.");
    if (hasQuestions && sentences.length < 3) suggestions.push("Add more context before posing your question.");
    if (suggestions.length < 3) suggestions.push("Structure your text with a clear opening, middle, and conclusion.");

    const tags = [];
    if (avgWords > 20) tags.push('Shorten');
    if (vocabularyRichness < 0.6) tags.push('Simplify');
    if (hasPassiveVoice) tags.push('Active Voice');
    if (isNegative) tags.push('Positive Tone');
    if (hasFillerWords) tags.push('Remove Fillers');
    if (!text.match(/[.!?]$/)) tags.push('Fix Punctuation');

    res.json({ sentiment, clarityScore, suggestions: suggestions.slice(0, 3), tags: tags.slice(0, 4) });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('Running on http://localhost:3000'));
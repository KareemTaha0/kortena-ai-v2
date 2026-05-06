require('dotenv').config();
const express = require('express');
const { HfInference } = require('@huggingface/inference');
const app = express();

app.use(express.json());

const hf = new HfInference(process.env.HF_API_KEY);

app.post('/analyze', async (req, res) => {
  const { text } = req.body;
  try {
    const sentiment = await hf.textClassification({
      model: 'distilbert/distilbert-base-uncased-finetuned-sst-2-english',
      inputs: text
    });

    // Smart rule-based suggestions
    const suggestions = [];
    const words = text.trim().split(/\s+/);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgWordsPerSentence = words.length / sentences.length;

    if (words.length < 20) suggestions.push("Your text is quite short — consider adding more detail to strengthen your message.");
    if (avgWordsPerSentence > 25) suggestions.push("Some sentences are too long — try breaking them into shorter ones for better clarity.");
    if (text === text.toLowerCase()) suggestions.push("Consider using proper capitalization to improve readability.");
    if (!text.match(/[.!?]$/)) suggestions.push("End your text with proper punctuation.");
    if (text.split(' ').filter(w => w.length > 12).length > 3) suggestions.push("You have several complex words — consider simplifying for a wider audience.");
    if (suggestions.length < 2) suggestions.push("Try using more specific and concrete language to make your point clearer.");
    if (suggestions.length < 3) suggestions.push("Read your text aloud to check if it flows naturally.");

    res.json({ sentiment, suggestions: suggestions.slice(0, 3) });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.use(express.static('public'));

app.listen(3000, () => console.log('Running on http://localhost:3000'));
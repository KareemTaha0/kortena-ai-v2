require('dotenv').config();
const express = require('express');
const { HfInference } = require('@huggingface/inference');
const app = express();

app.use(express.json());

const hf = new HfInference(process.env.HF_API_KEY);

app.post('/analyze', async (req, res) => {
  const { text } = req.body;
  try {
    const result = await hf.textClassification({
      model: 'distilbert/distilbert-base-uncased-finetuned-sst-2-english',
      inputs: text
    });
    console.log('Result:', JSON.stringify(result));
    res.json(result);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.use(express.static('public'));

app.listen(3000, () => console.log('Running on http://localhost:3000'));
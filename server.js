const express = require('express');
const multer = require('multer');
const fs = require('fs');
const axios = require('axios');
const cohere = require("cohere-ai");
const bodyParser = require('body-parser');
//const { cosineSimilarity } = require('./utils');

const COHERE_API_KEY = 'pjPS1nIa9HuGYGMLtfIy2peUD6d7OjtQIs5xd4dZ';
const COHERE_API_URL = 'https://api.cohere.ai/v1/embed';
CHUNK_SIZE = 1024
TEMPERATURE = 0.6
MAX_TOKENS = 100

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));


app.get('/', (req, res) => {        //get requests to the root ("/") will route here
    res.sendFile('index.html', {root: __dirname});      //server responds by sending the index.html file to the client's browser
                                                        //the .sendFile method needs the absolute path to the file, see: https://expressjs.com/en/4x/api.html#res.sendFile 
});



const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    console.log("Starting Upload");
    const file = req.file;
    const transcript = fs.readFileSync(file.path, 'utf8');
    const reference = process_text_input(transcript)
    const embeddings = await getEmbeddings(reference);
    
    if(embeddings.statusCode != 200){
      throw new Error("Cohere API Error")
    }
     
    res.json({ embeddings, reference });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error processing file' });
  }
});

app.post('/search', async (req, res) => {
  try {
    const { transcriptEmbedding, searchTerm, reference } = req.body;
    const searchEmbedding = await getEmbeddings([searchTerm]);

    if(searchEmbedding.statusCode != 200){
      throw new Error("Cohere API Error")
    }

    const results = search(transcriptEmbedding, searchEmbedding.body.embeddings);
    //Get the top 5 closest matches
    const retval = new Array(5)
    for (let i=0; i<5;i++){
      newPrompt =  '\n'.concat(reference[results[i].index]) + '\n' + searchTerm
      response = await cohere.generate ({model: 'command-xlarge-20221108', prompt: newPrompt, max_tokens: MAX_TOKENS, temperature: TEMPERATURE, return_likelihoods: 'NONE'})
      retval[i] = response.body.generations[0].text.replace(/\r?\n|\r/g, " ");
    }
    res.json({ retval });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error searching for term' });
  }
});


app.post('/extract', async (req, res) => {
  try {
    const { transcriptEmbedding, reference } = req.body;
    // Perform the default searches to try to get generic fianancial data
    baseData = await getBaseData(transcriptEmbedding, reference)
    res.json({ baseData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error searching for term' });
  }
});

async function getEmbeddings(text) {
    cohere.init(COHERE_API_KEY);
    response = await cohere.embed({texts: text, truncate: "NONE" });
  return response;
}


function process_text_input(text){
	chunks = text.match((new RegExp('.{1,' + CHUNK_SIZE + '}', 'g')));
	return chunks;
}

function cosineSimilarity(a, b) {
 
  b_transpose = b[0].map((_, colIndex) => b.map(row => row[colIndex]));
  const dotProduct = a.reduce((sum, val, i) => sum + val * b_transpose[i], 0);
  const aMagnitude = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const bMagnitude = Math.sqrt(b_transpose.reduce((sum, val) => sum + val * val, 0));

  return dotProduct / (aMagnitude * bMagnitude);
}

module.exports = { cosineSimilarity };

function dotproduct(a,b) {
  var n = 0, lim = Math.min(a.length,b.length);
  for (var i = 0; i < lim; i++) n += a[i] * b[i];
  return n;
}

function search(embeddings, searchEmbedding) {
  const similarityScores = embeddings.map((embedding, index) => ({
    index,
    similarity: cosineSimilarity(embedding, searchEmbedding)
  }));

  return similarityScores.sort((a, b) => b.similarity - a.similarity);
}

async function getBaseData(embedding, reference){
  EPS = "what were the earnings per share?";
  quarterRevenue = "What was the total revenue for the quarter?";
  quarterExpenses = "What were the total expense for the quarter?";
  netIncome = "What was the net income for the quarter?";

  qArray = [EPS, quarterRevenue,quarterExpenses, netIncome];

  answers = []


  cohere.init(COHERE_API_KEY);
  for (const element of qArray){
    embeddedElement = await getEmbeddings([element])

    if(embeddedElement.statusCode != 200){
      throw new Error("Cohere API Error")
    }
    
    results = search(embedding, embeddedElement.body.embeddings)[0]
    newPrompt =  '\n'.concat(reference[results.index]) + '\n' + element
    response = await cohere.generate ({model: 'command-xlarge-20221108', prompt: newPrompt, max_tokens: MAX_TOKENS, temperature: TEMPERATURE, return_likelihoods: 'NONE'})
    answer = response.body.generations[0].text.replace(/\r?\n|\r/g, " ");
    answers.push(answer)
    
  };

  
  return answers

}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));


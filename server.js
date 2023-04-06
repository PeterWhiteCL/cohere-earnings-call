const express = require('express');
const multer = require('multer');
const fs = require('fs');
const axios = require('axios');
const cohere = require("cohere-ai");
const bodyParser = require('body-parser');


const COHERE_API_KEY = 'pjPS1nIa9HuGYGMLtfIy2peUD6d7OjtQIs5xd4dZ';
CHUNK_SIZE = 1024
TEMPERATURE = 0.6
MAX_TOKENS = 100

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Load index
app.get('/', (req, res) => {        
    res.sendFile('index.html', {root: __dirname}); 
});

// Load the default earnings transcripts 
app.get('/files', (req, res) => {

  try{

    fs.readdir(__dirname, { withFileTypes: true }, (error, files) => {
      const directoriesInDIrectory = files.map((item) => item.name);
  
      directoriesInDIrectory.forEach(element=>process.stdout.write(element));
  });

    process.stdout.write("Testing");
    process.stdout.write("Testing1");
    process.stdout.write(__dirname);
    process.stdout.write("Testing2");
    const directoryPath = "transcripts"
    fs.readdir(directoryPath, (err, files) => {
      if (err) {
        res.status(500).send('Error reading directory' + err.message);
        process.stdout.write(err.message);
      } else {
        res.send(files);
      }
    });
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error Gathering Earnings Call Files' });
  }
});


// Upload and create embeddings for selected earnings call
app.post('/upload', async (req, res) => {
  try {
    console.log("Starting Upload");
    const filename = req.body.filename;
    const transcript = fs.readFileSync("transcripts/" +  filename , 'utf8');
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

// Performs semantic search based on passed in query
app.post('/search', async (req, res) => {
  try {
    const { transcriptEmbedding, searchTerm, reference } = req.body;
    // Get embeddings for search term
    const searchEmbedding = await getEmbeddings([searchTerm]);

    if(searchEmbedding.statusCode != 200){
      throw new Error("Cohere API Error")
    }

    // Find the best match search result
    const results = search(transcriptEmbedding, searchEmbedding.body.embeddings);
    const retval = new Array(1)

    // add a ? to the search term if it isn't present
    tempSearchTerm = searchTerm;
    if(!searchTerm.endsWith('?')){
      tempSearchTerm = searchTerm + '?'
    }
    // Use the text from the search along with the prompt to create a human readable response 
    newPrompt =  '\n'.concat(reference[results[0].index]) + '\n' + tempSearchTerm 
    response = await cohere.generate ({model: 'command-xlarge-20221108', prompt: newPrompt, max_tokens: MAX_TOKENS, temperature: TEMPERATURE, return_likelihoods: 'NONE'})

    // Clean the response 
    retval[0] = response.body.generations[0].text.replace(/\r?\n|\r/g, " "); 
  
    res.json({ retval });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error searching for term' });
  }
});

// Perform financial extractions
app.post('/extract', async (req, res) => {
  try {
    const { transcriptEmbedding, reference } = req.body;
    baseData = await getBaseData(transcriptEmbedding, reference)
    res.json({ baseData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving financial data' });
  }
});

// Returns embeddings for given text
async function getEmbeddings(text) {
    cohere.init(COHERE_API_KEY);
    response = await cohere.embed({texts: text, truncate: "NONE" });
  return response;
}

// chunks input text for embedding
function process_text_input(text){
	chunks = text.match((new RegExp('.{1,' + CHUNK_SIZE + '}', 'g')));
	return chunks;
}

// Similarity is determined through Cosine similarity function
function cosineSimilarity(a, b) {
 
  b_transpose = b[0].map((_, colIndex) => b.map(row => row[colIndex]));
  const dotProduct = a.reduce((sum, val, i) => sum + val * b_transpose[i], 0);
  const aMagnitude = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const bMagnitude = Math.sqrt(b_transpose.reduce((sum, val) => sum + val * val, 0));

  return dotProduct / (aMagnitude * bMagnitude);
}

// Perform the search across all embeddings
function search(embeddings, searchEmbedding) {
  const similarityScores = embeddings.map((embedding, index) => ({
    index,
    similarity: cosineSimilarity(embedding, searchEmbedding)
  }));

  return similarityScores.sort((a, b) => b.similarity - a.similarity);
}

// Prompts used to extract financial information
async function getBaseData(embedding, reference){
  EPS = "what were the earnings per share (EPS)?";
  quarterRevenue = "What was the total revenue for the time period covered by the transcript?";
  quarterExpenses = "What were the total expenses spent for the time period covered?";
  netIncome = "What was the net income for the time period covered?";

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


const express = require('express');
const fs = require('fs');
const cohere = require("cohere-ai");
require('dotenv').config();


const COHERE_API_KEY = process.env.APIKEY;
CHUNK_SIZE = 1024
TEMPERATURE = 0.6
MAX_TOKENS = 350

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
    const directoryPath = "transcripts/"
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
app.get('/upload', async (req, res) => {
  try {
    console.log("Starting Upload");    
    const filename = req.query.filename;
    console.log("Filename is: " + filename);
    const JSONFilename = filename.replace(".txt", ".json");
    console.log("Reading file");
    const transcript = fs.readFileSync("transcripts/" +  filename , 'utf8');
    const reference = process_text_input(transcript);
    console.log("file read");
    
    // If embedding doesn't exist then create it
    console.log("check embeddings");
    if(!fs.existsSync("embeddings/" +  JSONFilename)){
      console.log("Embeddings dont exist - creat them");
      const embeddings = await getEmbeddings(reference);
      // save embeddings to JSON
      embedJSON = JSON.stringify(embeddings);
      jsonFilename = filename.replace(".txt", "");
      console.log("Write embeddings");
      fs.writeFileSync("embeddings/" + jsonFilename + ".json", embedJSON);
    }
    
    console.log("Reading embeddings");
    const jsonEmbed = fs.readFileSync("embeddings/" +  JSONFilename , 'utf8');
    console.log("Json embed");
    console.log(jsonEmbed);
    embeddings = JSON.parse(jsonEmbed);
    
    
    console.log("returning");
    
    // res.send([ embeddings, reference, transcript ]);
  } catch (error) {
    console.log("Error caught");
    console.error(error.message);
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
    newPrompt =  "Using a complete sentence, answer the question based on the text provided." + '\n'.concat(reference[results[0].index]) + '\n' + tempSearchTerm 
    response = await cohere.generate ({model: 'command-xlarge-20221108', prompt: newPrompt, max_tokens: MAX_TOKENS, temperature: TEMPERATURE, return_likelihoods: 'NONE'})

    // Clean the response 
    retval[0] = response.body.generations[0].text.replace(/\r?\n|\r/g, " "); 
  
    res.json({ retval });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error searching for term' + error.message });
  }
});

app.post('/download', async (req, res) => {
  const filename = req.query.filename;

  var file = fs.readFileSync("transcripts/" +  filename , 'utf8');

  res.download(file, filename, (err)=>{
      if (err) {
        res.send({
            error : err,
            msg   : "Problem downloading the file"
        })
    }
  });
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
  try{
  b_transpose = b[0].map((_, colIndex) => b.map(row => row[colIndex]));
  const dotProduct = a.reduce((sum, val, i) => sum + val * b_transpose[i], 0);
  const aMagnitude = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const bMagnitude = Math.sqrt(b_transpose.reduce((sum, val) => sum + val * val, 0));
  
  return dotProduct / (aMagnitude * bMagnitude);
  }
  catch(error){
    return 0;
  }
}

// Perform the search across all embeddings
function search(embeddings, searchEmbedding) {
  const similarityScores = embeddings.map((embedding, index) => ({
    index,
    similarity: cosineSimilarity(embedding, searchEmbedding)
  }));

  return similarityScores.sort((a, b) => b.similarity - a.similarity);
}



const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));


document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-button');
    const searchContainer = document.getElementById('search-container');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const resultsList = document.getElementById('results-list');
    const clearButton = document.getElementById('clear-button');
    const epsLabel = document.getElementById('eps-label');
    const revenueLabel = document.getElementById('revenue-label');
    const expenseLabel = document.getElementById('expense-label');
    const netincomeLabel = document.getElementById('netincome-label');
    const extractButton = document.getElementById('extract-button');
    const loader = document.getElementById('loader');
    const financialData = document.getElementById('financial-data');
    const fileDropdown = document.getElementById('file-dropdown');
    const errorLabel = document.getElementById('error-label')

    let transcriptEmbedding;

    uploadForm.addEventListener('click', async (event) => {
        event.preventDefault();
        clearPage();
        const filename = fileDropdown.options[fileDropdown.selectedIndex].text;
       
        try {
            const response = await fetch('/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename}),
            
            });
            const fullresponse = await response.json();
            loader.style.display = "none"; 
            transcriptEmbedding = fullresponse.embeddings.body.embeddings;
            reference = fullresponse.reference;
            searchContainer.style.display = 'block';
            clearButton.style.display = '';
           
        } catch (error) {
            console.error('Error uploading file:', error);
            errorLabel.innerText = "Error uploading and embedding file";   
            errorLabel.style.display = "block";  
            errorLabel.style.color = 'red';       
            clearPage();
        }
    });

    clearButton.addEventListener('click', async () => {
       clearPage();
    });

    extractButton.addEventListener('click', async () => {
        loader2.style.display = "block"; 
        try {
            const response = await fetch('/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcriptEmbedding, reference }),
            });
            const fullresponse = await response.json();
            baseData = fullresponse.baseData;
            loader2.style.display = "none"; 
            epsLabel.innerText = "EPS: " + baseData[0]
            revenueLabel.innerText ="Revenue: " + baseData[1]
            expenseLabel.innerText = "Expenses: " + baseData[2]
            netincomeLabel.innerText = "Net Income: " + baseData[3]
            financialData.style.display = "block";
            errorLabel.style.display = 'none';
        }
        catch (error) {
            console.error('Error Extracting Financial Data:', error);
            errorLabel.innerText = 'Error Extracting Financial Data';
            errorLabel.style.display = "block";
            errorLabel.style.color = 'red';   
            clearPage();
        }
    });

    searchButton.addEventListener('click', async () => {
        const searchTerm = searchInput.value.trim();
        if (!searchTerm) return;

        loader1.style.display = "block"; 
        errorLabel.style.display = 'none';

        try {
            const response = await fetch('/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcriptEmbedding, searchTerm, reference }),
            });
            const results = await response.json();

            resultsList.innerHTML = '';
            tempresults = Object.values(results)[0]
            tempresults.forEach(result => {
                const listItem = document.createElement('li');
                listItem.innerText = result;
                resultsList.appendChild(listItem);
            });
            loader1.style.display = "none"; 
        } catch (error) {
            console.error('Error performing semantic search:', error);
            errorLabel.innerText = 'Error performing semantic search';
            errorLabel.style.display = "block";
            errorLabel.style.color = 'red';   
            clearPage();
        }
    });


    function clearPage(){
        resultsList.value = [];
        searchInput.value = "";
        epsLabel.innerText = "";
        revenueLabel.innerText = "";
        expenseLabel.innerText = "";
        netincomeLabel.innerText = "";
        financialData.style.display = "none";
        clearButton.style.display = "none";
        searchContainer.style.display = 'none';
    }
      
    async function getFiles() {
        try {
          const response = await fetch('/files');
          const files = await response.json();
          populateDropdown(files);
        } catch (error) {
          console.error('Error fetching files:', error);
        }
      }

      function populateDropdown(files) {
          const dropdown = document.getElementById('file-dropdown');

          files.forEach(file => {
              const option = document.createElement('option');
              option.value = file;
              option.textContent = file;
              dropdown.appendChild(option);
          });
      }

      window.addEventListener('DOMContentLoaded', getFiles);
});
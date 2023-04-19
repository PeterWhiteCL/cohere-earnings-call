document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-button');
    const searchContainer = document.getElementById('search-container');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const resultsList = document.getElementById('results-list');
    const clearButton = document.getElementById('clear-button');
    const loader = document.getElementById('loader');
    const fileDropdown = document.getElementById('file-dropdown');
    const errorLabel = document.getElementById('error-label');
    const ceoQuestion = document.getElementById('ceo-question');
    const salesQuestion = document.getElementById('sales-question');
    const epsQuestion = document.getElementById('eps-question');
    const expenseQuestion = document.getElementById('expenses-question');
    const resultsPanel = document.getElementById('results-panel');
    const downloadButton = document.getElementById('download-button');

    let transcriptEmbedding;
    let transcript

    uploadForm.addEventListener('click', async (event) => {
        event.preventDefault();
        clearPage();
        const filename = fileDropdown.options[fileDropdown.selectedIndex].value;
       
        try {
            const response = await fetch('/upload?filename='+ filename, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                // body: JSON.stringify({ filename}),
            
            });
            const fullresponse = await response.json();
            loader.style.display = "none"; 
            transcriptEmbedding = fullresponse.embeddings.body.embeddings;
            reference = fullresponse.reference;
            transcript = fullresponse.transcript;
            searchContainer.style.display = 'block';
            clearButton.style.display = '';
            downloadButton.style.display='';
           
        } catch (error) {
            clearPage();
            console.error('Error uploading file:', error);
            errorLabel.innerText = "Error uploading and embedding file";   
            errorLabel.style.display = "block";  
            errorLabel.style.color = 'red';       
            
        }
    });

    clearButton.addEventListener('click', async () => {
       clearPage();
    });

    searchButton.addEventListener('click', async () => {
        const searchTerm = searchInput.value.trim();
        if (!searchTerm) return;

       searchFunction(searchTerm);
    });


    async function searchFunction(searchTerm){
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
            resultsPanel.style.display = "block";
            loader1.style.display = "none"; 
        } catch (error) {
            console.error('Error performing semantic search:', error);
            errorLabel.innerText = 'Error performing semantic search';
            errorLabel.style.display = "block";
            errorLabel.style.color = 'red';   
            loader1.style.display = "none"; 
        }
    }


    function clearPage(){
        resultsList.value = [];
        searchInput.value = "";
        clearButton.style.display = "none";
        downloadButton.style.display = "none";
        searchContainer.style.display = 'none';
        while(( lis =resultsList.getElementsByTagName("li")).length > 0) {
            resultsList.removeChild(lis[0]);
        }
        loader.style.display = "none"; 
        loader1.style.display = "none"; 
        errorLabel.style.display = "none";
        resultsPanel.style.display = "none";
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
              option.textContent = file.replace(".txt", "");
              dropdown.appendChild(option);
          });
      }

      window.addEventListener('DOMContentLoaded', getFiles);

      downloadButton.addEventListener('click', async () => {

        const filename = fileDropdown.options[fileDropdown.selectedIndex].value;
        const fileUrl = window.URL.createObjectURL(new Blob([transcript]));
        const fileLink = document.createElement('a');
        fileLink.href = fileUrl;
        fileLink.setAttribute('download', filename);
        fileLink.setAttribute('target', '_blank');
        document.body.appendChild(fileLink);
        fileLink.click();
        fileLink.remove();

        // const filename = fileDropdown.options[fileDropdown.selectedIndex].value;
        // try {
        //     const response = await fetch('/download?filename=' + filename, {
        //         method: 'POST',
        //         headers: { 'Content-Type': 'application/json' },
        //     });

        //     console.log(response);
        // } catch (error) {
        //     console.error('Error performing semantic search:', error);
        //     errorLabel.innerText = 'Error performing semantic search';
        //     errorLabel.style.display = "block";
        //     errorLabel.style.color = 'red';   
        //     loader1.style.display = "none"; 
        // }
      });




      //Sample questions
      ceoQuestion.addEventListener('click', async () => {
        await searchFunction(ceoQuestion.innerText);
     });

     salesQuestion.addEventListener('click', async () => {
        await searchFunction(salesQuestion.innerText);
     });

     epsQuestion.addEventListener('click', async () => {
        await searchFunction(epsQuestion.innerText);
     });

     expenseQuestion.addEventListener('click', async () => {
        await searchFunction(expenseQuestion.innerText);
     });
});
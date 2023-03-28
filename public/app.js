document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
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

    let transcriptEmbedding;

    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!fileInput.files[0]) return;
        resultsList.value = [];
        searchInput.value = "";
        epsLabel.innerText = "";
        revenueLabel.innerText = "";
        expenseLabel.innerText = "";
        netincomeLabel.innerText = "";

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        loader.style.display = "block"; 
        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData,
            });
            const tempresonse = await response.text();
//             const fullresponse = await response.json();
            loader.style.display = "none"; 
            transcriptEmbedding = fullresponse.embeddings.body.embeddings;
            reference = fullresponse.reference;
            searchContainer.style.display = 'block';
           
        } catch (error) {
            console.error('Error uploading file:', error);
        }
    });

    clearButton.addEventListener('click', async () => {
       resultsList.value = [];
       searchInput.value = "";
       fileInput.value = "";
       epsLabel.innerText = "";
       revenueLabel.innerText = "";
       expenseLabel.innerText = "";
       netincomeLabel.innerText = "";
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
        }
        catch (error) {
            console.error('Error Extracting Financial Data:', error);
        }
    });

    searchButton.addEventListener('click', async () => {
        const searchTerm = searchInput.value.trim();
        if (!searchTerm) return;

        loader1.style.display = "block"; 

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
        }
    });
});

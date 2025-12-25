document.addEventListener('DOMContentLoaded', () => {
    const folderSelect = document.getElementById('folder-select');
    const searchInput = document.getElementById('search-query');
    const searchBtn = document.getElementById('run-search');
    const managerBtn = document.getElementById('open-manager');

    let allFolders = [];

    // 1. Load Folders and set the previously selected folder
    chrome.storage.local.get(['folders', 'activeFolderId'], (result) => {
        if (result.folders && result.folders.length > 0) {
            allFolders = result.folders;
            folderSelect.innerHTML = ''; 
            
            allFolders.forEach(folder => {
                const option = document.createElement('option');
                option.value = folder.id;
                option.textContent = `${folder.name} (${folder.engines.length})`;
                folderSelect.appendChild(option);
            });

            // Set the dropdown to the saved ID if it exists, otherwise default to first
            if (result.activeFolderId) {
                folderSelect.value = result.activeFolderId;
            } else {
                // If no folder was saved, save the first one as default
                saveActiveFolder(allFolders[0].id);
            }

        } else {
            folderSelect.innerHTML = '<option disabled>No folders found</option>';
            searchBtn.disabled = true;
        }
    });

    // 2. Save the selected folder whenever it changes
    folderSelect.addEventListener('change', (e) => {
        saveActiveFolder(e.target.value);
    });

    function saveActiveFolder(id) {
        chrome.storage.local.set({ activeFolderId: parseInt(id) });
    }

    // 3. Handle Search Click
    searchBtn.addEventListener('click', () => {
        const query = searchInput.value.trim();
        const folderId = parseInt(folderSelect.value);

        if (!query) {
            alert('Please enter a search term');
            return;
        }
        performSearch(folderId, query);
    });
	
    function performSearch(folderId, query) {
        const selectedFolder = allFolders.find(f => f.id === folderId);
        
        if (selectedFolder && selectedFolder.engines.length > 0) {
            const encodedQuery = encodeURIComponent(query);

            selectedFolder.engines.forEach(engine => {
                let finalUrl = engine.url.replaceAll('searchcenter', encodedQuery);
                chrome.tabs.create({ url: finalUrl, active: false });
            });
        } else {
            alert('This folder has no search engines or does not exist!');
        }
    }

    // 4. Open Manager
    managerBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'manager.html' });
    });
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchBtn.click();
    });
});
document.addEventListener('DOMContentLoaded', () => {

    // Make all links in the popup open in a new tab
    document.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: link.href });
        });
    });
});
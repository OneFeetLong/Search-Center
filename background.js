// 1. Create the Context Menu Item when extension is installed/updated
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "search-center-context",
        title: "Search '%s' in Active Folder", 
        contexts: ["selection"] // Only show when text is highlighted
    });
});

// 2. Listen for clicks on the context menu
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "search-center-context" && info.selectionText) {
        
        // Get the selected text
        const query = info.selectionText.trim();
        
        // Retrieve the Folders AND the Active Folder ID
        chrome.storage.local.get(['folders', 'activeFolderId'], (data) => {
            const folders = data.folders || [];
            const activeId = data.activeFolderId;

            if (!activeId) {
                console.warn("No active folder selected in Search Center.");
                return;
            }

            // Find the active folder
            const folder = folders.find(f => f.id === activeId);

            if (folder && folder.engines.length > 0) {
                const encodedQuery = encodeURIComponent(query);
                
                // Open tabs
                folder.engines.forEach(engine => {
                    let finalUrl = engine.url.replaceAll('searchcenter', encodedQuery);
                    chrome.tabs.create({ url: finalUrl, active: false });
                });
            } else {
                console.warn("Folder not found or empty.");
            }
        });
    }
});
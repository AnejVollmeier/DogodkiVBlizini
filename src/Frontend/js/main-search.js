document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('mainSearchInput');
    const searchButton = document.querySelector('.big-search-btn');

    function handleSearch(e) {
        e.preventDefault();
        const searchTerm = searchInput.value.trim();
        if (searchTerm) {
            window.location.href = `dogodki.html?naziv=${encodeURIComponent(searchTerm)}`;
        }
    }

    // Handle button click
    searchButton.addEventListener('click', handleSearch);

    // Handle enter key press
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch(e);
        }
    });
});

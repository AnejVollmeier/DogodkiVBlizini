document.addEventListener("DOMContentLoaded", function () {
  let statisticsData = null;

  // Fetch statistics data from the API 
  fetchStatistics().then(data => {
    statisticsData = data;
    prepareCounters();
  });

  // Fetch statistics data from the API
  async function fetchStatistics() {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/statistics/`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching statistics:', error);
      return {
        totalUsers: 0,
        organizersCount: 0,
        eventsLastYear: 0,
        cities: 0
      };
    }
  }

  // Prepare counter elements with data from API (without starting animation)
  function prepareCounters() {
    if (!statisticsData) return;
    
    // Map the data to the corresponding counter elements
    const counterMap = {
      'users-count': statisticsData.totalUsers,
      'organizers-count': statisticsData.organizersCount,
      'events-count': statisticsData.eventsLastYear,
      'cities-count': statisticsData.cities
    };
    
    // Update data-count attribute for each counter
    Object.keys(counterMap).forEach(id => {
      const counterElement = document.getElementById(id);
      if (counterElement) {
        counterElement.setAttribute('data-count', counterMap[id]);
      }
    });
  }

  function animateCounters() {
    const counters = document.querySelectorAll(".stat-number");
    const baseDuration = 2000; 
    
    counters.forEach((counter) => {
      const target = +counter.getAttribute("data-count");
      let count = 0;
      
      // Adjust duration based on number size 
      const duration = target < 100 ? baseDuration * 0.5 : baseDuration;
      
      // Set a minimum increment to avoid excessively slow animations for small numbers
      const minIncrement = target < 20 ? 0.5 : 1;
      const inc = Math.max(minIncrement, (target / duration) * 10);
      
      // Calculate steps to make animation consistent
      const steps = Math.ceil(target / inc);
      const stepTime = duration / steps;

      const updateCount = () => {
        if (count < target) {
          count = Math.min(count + inc, target);
          counter.innerText = Math.floor(count);
          setTimeout(updateCount, stepTime);
        } else {
          counter.innerText = target.toLocaleString("sl-SI");
        }
      };

      updateCount();
    });
  }

  // Start animation when the section is visible
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // If data is already loaded, animate immediately
        if (statisticsData) {
          animateCounters();
        } else {
          // If data isn't loaded yet, wait for it
          fetchStatistics().then(data => {
            statisticsData = data;
            prepareCounters();
            animateCounters();
          });
        }
        observer.unobserve(entry.target);
      }
    });
  });

  const statisticsSection = document.querySelector(".statistics-section");
  if (statisticsSection) {
    observer.observe(statisticsSection);
  }
});
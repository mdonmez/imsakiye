// Constants
const API_URL = 'https://api.aladhan.com/v1/timingsByAddress/';
const GEOCODING_URL = 'https://nominatim.openstreetmap.org/reverse?format=json&';
const IP_API_URL = 'http://ip-api.com/json/';
const DEFAULT_LOCATION = {
  display: 'İstanbul',
  value: 'Istanbul, Turkey',
};
const TURKISH_CITIES_DATA_PATH = 'data/locations.json';
const USER_AGENT = 'iftar Web Client / 1.0';
const THEME_STORAGE_KEY = 'ramazan-theme';
const LOCATION_COOKIE_KEY = 'location';

// --- DOM Element References ---
const dom = {
    locationText: document.getElementById('location-text'),
    timeText: document.getElementById('time-text'),
    spinner: document.getElementById('spinner'),
    countdownTitle: document.getElementById('countdown-title'),
    countdownType: document.getElementById('countdown-type'),
    hoursElement: document.getElementById('hours'),
    minutesElement: document.getElementById('minutes'),
    secondsElement: document.getElementById('seconds'),
    currentDateElement: document.getElementById('current-date'),
    locationSearch: document.getElementById('location-search'),
    searchResults: document.getElementById('search-results'),
    iftarNowElement: document.getElementById('iftar-now'),
    locationButton: document.getElementById('location-button'),
    locationDropdown: document.querySelector('.location-dropdown'),
    locationContainer: document.querySelector('.location-search-container'),
    countdownContainer: document.querySelector('.countdown-container'),
    themeToggle: document.getElementById('theme-toggle'),
    themeIcon: document.getElementById('theme-icon'),
    infoButton: document.getElementById('info-toggle'),
    infoContainer: document.getElementById('info-container'),
};

// --- State Variables ---
let state = {
    turkishLocations: [],
    currentLocation: '',
    currentLocationDisplay: '',
    prayerTimes: null,
    targetTime: null,
    countdownRequestId: null,
    currentSearchResults: [],
    selectedResultIndex: -1,
    locationTextFullValue: '',
    searchDebounceTimeout: null,
    theme: 'dark', // Default theme
};

// Store original button styles after DOM is loaded
let infoToggleButton;

function captureOriginalStyles() {
    infoToggleButton = document.getElementById('info-toggle');
    infoToggleButton.originalIcon = infoToggleButton.innerHTML;
    console.log('Original styles captured:', infoToggleButton.originalIcon);
}

function setupInfoToggle() {
    infoToggleButton.addEventListener('click', function() {
        console.log('Button clicked, current state:', this.textContent);
        if (this.classList.contains('expanded')) {
            this.classList.remove('expanded');
            this.innerHTML = this.originalIcon;
        } else {
            this.classList.add('expanded');
            this.textContent = "Vakitlerin garantisi yoktur.";
        }
    });
}

// --- Utility Functions ---

/**
 * Creates a debounced function that delays invoking `func` until after `wait` milliseconds
 * have elapsed since the last time the debounced function was invoked.
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

/** Measures the width of a text string. */
function measureTextWidth(text, fontStyle) {
  const canvas = measureTextWidth.canvas || (measureTextWidth.canvas = document.createElement('canvas'));
  const context = canvas.getContext('2d');
  context.font = fontStyle;
  return context.measureText(text).width;
}

/** Checks if text needs truncation. */
function needsTruncation(text, container, textElement, reservedSpace = 0) {
    if (!text || !container || !textElement) return false;
    const fontStyle = window.getComputedStyle(textElement).font;
    const containerWidth = container.clientWidth;
    const availableWidth = containerWidth - reservedSpace;
    return measureTextWidth(text, fontStyle) > availableWidth;
}

/** Truncates text to fit within available space. */
function truncateText(text, maxWidth, fontStyle, ellipsis = '...') {
  if (!text) return '';
  const fullTextWidth = measureTextWidth(text, fontStyle);
  if (fullTextWidth <= maxWidth) return text;

  const ellipsisWidth = measureTextWidth(ellipsis, fontStyle);
  let low = 0;
  let high = text.length;
  let best = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const truncated = text.substring(0, mid);
    const truncatedWidth = measureTextWidth(truncated, fontStyle) + ellipsisWidth;

    if (truncatedWidth <= maxWidth) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return text.substring(0, best) + ellipsis;
}

/** Updates the location text display, truncating if necessary. */
function updateLocationTextDisplay() {
    if (!state.locationTextFullValue || !dom.locationText || !dom.locationContainer) return;

    dom.locationText.title = state.locationTextFullValue; // Tooltip

    const locationIconWidth = 25;
    const locationButtonWidth = 40;
    const padding = 20;
    const reservedSpace = locationIconWidth + locationButtonWidth + padding;
    const fontStyle = window.getComputedStyle(dom.locationText).font;

    if (needsTruncation(state.locationTextFullValue, dom.locationContainer, dom.locationText, reservedSpace)) {
        const availableWidth = dom.locationContainer.clientWidth - reservedSpace;
        const truncatedText = truncateText(state.locationTextFullValue, availableWidth, fontStyle);
        dom.locationText.textContent = truncatedText;
    } else {
        dom.locationText.textContent = state.locationTextFullValue;
    }
}

/** Sets the location text and initiates the update of the display.*/
function setLocationText(text) {
  if (!text) return;
  state.locationTextFullValue = text;
  updateLocationTextDisplay();
}

/** Updates the current date display. */
function updateCurrentDate() {
    const now = new Date();
    dom.currentDateElement.textContent = now.toLocaleDateString('tr-TR', {
        day: 'numeric', month: 'long', year: 'numeric', weekday: 'long'
    });
}

// --- Theme Functions ---

/**
 * Initializes the theme based on user preference or system preference
 */
function initTheme() {
    // Check if user has previously selected a theme
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    
    if (savedTheme) {
        // Use the saved theme preference
        state.theme = savedTheme;
    } else {
        // Check if user prefers dark mode at system level
        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        state.theme = prefersDarkMode ? 'dark' : 'light';
    }
    
    // Apply the theme
    applyTheme(state.theme);
}

/**
 * Applies the selected theme to the document
 */
function applyTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        dom.themeIcon.classList.remove('fa-moon');
        dom.themeIcon.classList.add('fa-sun');
    } else {
        document.body.classList.remove('light-theme');
        dom.themeIcon.classList.remove('fa-sun');
        dom.themeIcon.classList.add('fa-moon');
    }
    
    // Save theme preference to localStorage
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    state.theme = theme;
}

/**
 * Toggles between light and dark themes
 */
function toggleTheme() {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
}

// --- Location Functions ---

/**
 * Detects the user's location using either browser geolocation or IP-based lookup.
 * Attempts browser geolocation first; falls back to IP-based location on failure.
 */
async function detectLocation() {
    showLoading();
    try {
        const location = await getLocation();
        await processGeolocation(location);
    } catch (error) {
        console.error('Failed to get location:', error);
        await getLocationFromIp(); // Fallback to IP
    } finally {
        hideLoading();
    }
}

function getLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000, // 10 seconds
            maximumAge: 0
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            (error) => {
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        reject(new Error('User denied the request for Geolocation.'));
                        break;
                    case error.POSITION_UNAVAILABLE:
                        reject(new Error('Location information is unavailable.'));
                        break;
                    case error.TIMEOUT:
                        reject(new Error('The request to get user location timed out.'));
                        break;
                    default:
                        reject(new Error('An unknown error occurred.'));
                }
            },
            options
        );
    });
}

/**
 * Processes geolocation data to determine the city and updates the UI.
 * @param {Object} location - Geolocation data from the browser.
 */
async function processGeolocation(location) {
    const { latitude, longitude } = location;
    try {
        const response = await fetch(`${GEOCODING_URL}lat=${latitude}&lon=${longitude}&zoom=10&accept-language=tr`);
        const data = await response.json();

        if (data && data.address) {
            const city = data.address.city || data.address.town || data.address.village || '';
            const state = data.address.state || '';
            const country = data.address.country || '';

            state.currentLocationDisplay = city;
            if (state && state !== city) {
                state.currentLocationDisplay += `, ${state}`;
            }
            state.currentLocation = `${city}, ${country}`;
            setLocationText(state.currentLocationDisplay);
        } else {
          console.error('Invalid geocoding response:', data);
          setDefaultLocation(); // Fallback to default
        }
    } catch (error) {
        console.error('Error in reverse geocoding:', error);
        setDefaultLocation(); // Fallback to default
    }
}

/**
 * Retrieves the user's location based on their IP address as a fallback.
 */
async function getLocationFromIp() {
    try {
        const response = await fetch(IP_API_URL);
        const data = await response.json();

        if (data && data.status === 'success') {
            state.currentLocationDisplay = data.city;
            state.currentLocation = `${data.city}, ${data.country}`;
            setLocationText(state.currentLocationDisplay);
        } else {
            console.error('Failed to fetch location from IP API:', data);
            setDefaultLocation();
        }
    } catch (error) {
        console.error('Error fetching location from IP API:', error);
        setDefaultLocation();
    }
}

/** Sets the location to a default value (Istanbul). */
function setDefaultLocation() {
  state.currentLocation = DEFAULT_LOCATION.value;
  state.currentLocationDisplay = DEFAULT_LOCATION.display;
  setLocationText(state.currentLocationDisplay);
}

// --- Prayer Time Functions ---

/** Fetches prayer times for the given location. */
async function getPrayerTimes(location) {
    const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).split('/').join('-');
    const url = `${API_URL}${currentDate}?address=${location}&method=13&school=1&calendarMethod=DIYANET`;
    const headers = { "User-Agent": USER_AGENT };

    try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
          throw new Error(`API request failed with status code ${response.status}`);
        }
        const data = await response.json();
        if (data && data.data && data.data.timings) {
            return data.data.timings;
        } else {
          throw new Error("Invalid response format from API");
        }
    } catch (error) {
      console.error('Error fetching prayer times:', error);
      return { error: error.message };
    }
}

/** Updates prayer times and starts/restarts the countdown. */
async function updatePrayerTimesAndStartCountdown() {
    if (!state.currentLocation) {
      console.warn('Current location not set. Cannot update prayer times.');
      return;
    }
    showLoading();
    try {
      state.prayerTimes = await getPrayerTimes(state.currentLocation);
      if (state.prayerTimes.error) {
        dom.timeText.textContent = 'Vakitler alınamadı';
        return;
      }
      determineTargetTime();  // This will also start the countdown.
      updateTimeText();
    } catch (error) {
      console.error('Error updating prayer times:', error);
      dom.timeText.textContent = 'Vakitler alınamadı';
    } finally {
      hideLoading();
    }
}

/** Determines whether to count down to Iftar or Sahur. */
function determineTargetTime() {
    if (!state.prayerTimes) {
        console.warn('Prayer times not available. Cannot determine target time.');
        return;
    }

    const now = new Date();
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
    const [fajrHours, fajrMinutes] = state.prayerTimes.Fajr.split(':').map(Number);
    const [maghribHours, maghribMinutes] = state.prayerTimes.Maghrib.split(':').map(Number);
    const fajrTimeInMinutes = fajrHours * 60 + fajrMinutes;
    const maghribTimeInMinutes = maghribHours * 60 + maghribMinutes;

    let targetDate = new Date();

    if (currentTimeInMinutes < fajrTimeInMinutes) {
        dom.countdownType.textContent = 'Sahur';
        targetDate.setHours(fajrHours, fajrMinutes, 0, 0);
    } else if (currentTimeInMinutes < maghribTimeInMinutes) {
        dom.countdownType.textContent = 'İftar';
        targetDate.setHours(maghribHours, maghribMinutes, 0, 0);
    } else {
        dom.countdownType.textContent = 'Sahur';
        targetDate.setDate(targetDate.getDate() + 1); // Next day
        targetDate.setHours(fajrHours, fajrMinutes, 0, 0);
    }

    state.targetTime = targetDate.getTime();

    // Hide iftar notification if necessary
    if (dom.countdownType.textContent !== 'İftar' || (maghribTimeInMinutes - currentTimeInMinutes) > 0) {
        dom.iftarNowElement.classList.remove('active');
    }

    startCountdown();
}

/** Updates the displayed time text (Iftar or Sahur time). */
function updateTimeText() {
    if (state.prayerTimes) {
        dom.timeText.textContent = dom.countdownType.textContent === 'İftar' ? `İftar: ${state.prayerTimes.Maghrib}` : `Sahur: ${state.prayerTimes.Fajr}`;
    }
}

// --- Countdown Functions ---

/** Starts the countdown animation using requestAnimationFrame. */
function startCountdown() {
    if (state.countdownRequestId) {
        cancelAnimationFrame(state.countdownRequestId);
    }
    state.countdownRequestId = requestAnimationFrame(updateCountdown);
}

/** Updates the countdown display. This is the core countdown logic. */
function updateCountdown() {
    if (!state.targetTime) return;

    const now = Date.now();
    const diff = state.targetTime - now;

    if (diff <= 0) {
        // Time has arrived.
      updateCountdownDisplay(0, 0, 0);

      if (dom.countdownType.textContent === 'İftar') {
        dom.iftarNowElement.classList.remove('hidden');
        dom.iftarNowElement.classList.add('active');
        dom.countdownContainer.classList.add('iftar-highlight'); // CSS animation
        setTimeout(() => dom.countdownContainer.classList.remove('iftar-highlight'), 3000);
      }

      // Prepare for the next countdown.
      setTimeout(determineTargetTime, 2000); // Recalculate target time.
      return;
    }

    // Hide iftar now if needed
    if (!dom.iftarNowElement.classList.contains('hidden')) {
        dom.iftarNowElement.classList.add('hidden');
        dom.iftarNowElement.classList.remove('active');
    }

    const hours = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, '0');
    const minutes = String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
    const seconds = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, '0');

    updateCountdownDisplay(hours, minutes, seconds);

    // Request the next animation frame.
    state.countdownRequestId = requestAnimationFrame(updateCountdown);
}

/** Updates the countdown display elements with animation. */
function updateCountdownDisplay(hours, minutes, seconds) {
  // Function to animate a single time element
  function animateTimeElement(element, newValue) {
    if (element.textContent !== newValue) {
      element.classList.add('time-change');
      element.textContent = newValue;
      setTimeout(() => element.classList.remove('time-change'), 200);
    }
  }
  animateTimeElement(dom.hoursElement, hours);
  animateTimeElement(dom.minutesElement, minutes);
  animateTimeElement(dom.secondsElement, seconds);
}

// --- Location Search Functions ---

/** Fetches and processes Turkish locations from the JSON file. */
async function fetchTurkishLocations() {
    try {
        const response = await fetch(TURKISH_CITIES_DATA_PATH);
        if (!response.ok) {
            throw new Error(`Failed to load locations data: ${response.status} ${response.statusText}`);
        }
        const turkishCitiesData = await response.json();

        // Flatten the data for easier searching.
        const locationList = [];
        for (const [city, districts] of Object.entries(turkishCitiesData)) {
            locationList.push({ displayName: city, searchValue: `${city}, Türkiye` });
            for (const district of districts) {
                if (district !== city) {
                    locationList.push({ displayName: `${district}, ${city}`, searchValue: `${district}, ${city}, Türkiye` });
                }
            }
        }
        state.turkishLocations = locationList.map(location => ({
            ...location,
            lowerDisplayName: turkishToLower(location.displayName),
            normalizedDisplayName: normalizeForSearch(location.displayName)
        }));

    } catch (error) {
        console.error('Error setting up Turkish locations:', error);
        // Fallback to major cities
        state.turkishLocations = [
            { displayName: "İstanbul", searchValue: "İstanbul, Türkiye", lowerDisplayName: "istanbul", normalizedDisplayName: "istanbul" },
            { displayName: "Ankara", searchValue: "Ankara, Türkiye", lowerDisplayName: "ankara", normalizedDisplayName: "ankara" },
            { displayName: "İzmir", searchValue: "İzmir, Türkiye", lowerDisplayName: "izmir", normalizedDisplayName: "izmir" },
            { displayName: "Bursa", searchValue: "Bursa, Türkiye", lowerDisplayName: "bursa", normalizedDisplayName: "bursa" },
            { displayName: "Antalya", searchValue: "Antalya, Türkiye", lowerDisplayName: "antalya", normalizedDisplayName: "antalya" },
            { displayName: "Adana", searchValue: "Adana, Türkiye", lowerDisplayName: "adana", normalizedDisplayName: "adana" },
            { displayName: "Konya", searchValue: "Konya, Türkiye", lowerDisplayName: "konya", normalizedDisplayName: "konya" },
        ];
    }
}

/** Converts Turkish characters to lowercase for consistent comparison. */
function turkishToLower(text) {
    return text
        .replace(/İ/g, "i")
        .replace(/I/g, "ı")
        .replace(/Ğ/g, "ğ")
        .replace(/Ü/g, "ü")
        .replace(/Ç/g, "ç")
        .replace(/Ö/g, "ö")
        .replace(/Ş/g, "ş")
        .toLowerCase();
}

/** Normalizes text for searching, converting both Turkish and non-Turkish characters. */
function normalizeForSearch(text) {
    if (!text) return '';
    return turkishToLower(text)
        .replace(/ü/g, "u")
        .replace(/ğ/g, "g")
        .replace(/ı/g, "i")
        .replace(/ş/g, "s")
        .replace(/ö/g, "o")
        .replace(/ç/g, "c");
}

/** Handles the location search, filtering and displaying results. */
const handleSearch = debounce(() => {
    const query = dom.locationSearch.value.trim();
    const lowerQuery = turkishToLower(query);
    const normalizedQuery = normalizeForSearch(query);

    if (query.length < 1) {
        state.currentSearchResults = state.turkishLocations.slice(0, 20);
    } else {
        state.currentSearchResults = state.turkishLocations
            .filter(location => {
                return (
                    location.lowerDisplayName.startsWith(lowerQuery) ||
                    location.normalizedDisplayName.startsWith(normalizedQuery) ||
                    location.lowerDisplayName.includes(lowerQuery) ||
                    location.normalizedDisplayName.includes(normalizedQuery)
                );
            })
            .slice(0, 30);
    }

    // Batch DOM updates
    const resultsHTML = state.currentSearchResults
        .map((location, index) => {
            const isSelected = index === state.selectedResultIndex;
            const displayText = location.displayName;
            let highlightedText = displayText;

            if (query.length >= 1) {
                const normalizedIndex = location.normalizedDisplayName.indexOf(normalizedQuery);
                if (normalizedIndex !== -1) {
                    const beforeMatch = displayText.substring(0, normalizedIndex);
                    const match = displayText.substring(normalizedIndex, normalizedIndex + normalizedQuery.length);
                    const afterMatch = displayText.substring(normalizedIndex + normalizedQuery.length);
                    highlightedText = `${beforeMatch}<span class="highlight">${match}</span>${afterMatch}`;
                }
            }

            return `<div class="search-item${isSelected ? ' selected' : ''}"
                role="option"
                aria-selected="${isSelected}"
                onclick="selectLocation('${location.searchValue}', '${location.displayName}')">
                ${highlightedText}
            </div>`;
        })
        .join('');

    dom.searchResults.innerHTML = resultsHTML;
    dom.searchResults.classList.toggle('active', state.currentSearchResults.length > 0);
    updateSelectedSearchItem();
}, 300);

/** Selects a location from the search results. */
async function selectLocation(locationValue, displayName) {
    dom.locationSearch.value = '';
    state.currentLocation = locationValue;
    state.currentLocationDisplay = displayName;
    setLocationText(displayName);
    saveLocationToCookie(locationValue);
    toggleLocationDropdown(false);
    dom.searchResults.innerHTML = '';
    updatePrayerTimesAndStartCountdown();
}

/** Handles keyboard navigation in the search results. */
function handleKeyNavigation(e) {
    if (!dom.locationDropdown.classList.contains('active')) return;

    const searchItems = dom.searchResults.querySelectorAll('.search-item');
    if (searchItems.length === 0) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        state.selectedResultIndex = Math.min(state.selectedResultIndex + 1, searchItems.length - 1);
        updateSelectedSearchItem();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        state.selectedResultIndex = Math.max(state.selectedResultIndex - 1, 0);
        updateSelectedSearchItem();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (state.selectedResultIndex >= 0 && state.selectedResultIndex < state.currentSearchResults.length) {
            const selectedLocation = state.currentSearchResults[state.selectedResultIndex];
            selectLocation(selectedLocation.searchValue, selectedLocation.displayName);
        } else if (state.currentSearchResults.length > 0) {
            const firstLocation = state.currentSearchResults[0];
            selectLocation(firstLocation.searchValue, firstLocation.displayName);
        }
    } else if (e.key === 'Escape') {
        e.preventDefault();
        toggleLocationDropdown(false);
    }
}

/** Updates the visual selection in the search results list. */
function updateSelectedSearchItem() {
    const searchItems = dom.searchResults.querySelectorAll('.search-item');
    searchItems.forEach((item, index) => {
      const isSelected = index === state.selectedResultIndex;
      item.classList.toggle('selected', isSelected);
      item.setAttribute('aria-selected', isSelected.toString());
        if (isSelected) {
            item.scrollIntoView({ block: 'nearest' });
        }
    });
}

// --- UI Interaction Functions ---

/** Shows the loading spinner. */
function showLoading() {
  dom.spinner.classList.add('loading');
  document.body.style.pointerEvents = 'none'; // Prevent interactions.
}

/** Hides the loading spinner. */
function hideLoading() {
    dom.spinner.classList.remove('loading');
    document.body.style.pointerEvents = ''; // Re-enable interactions.
    dom.countdownContainer.style.transform = 'scale(1.03)';  // Subtle animation
    setTimeout(() => { dom.countdownContainer.style.transform = ''; }, 300);
}

/** Toggles the visibility of the location dropdown. */
function toggleLocationDropdown(forceState) {
    const dropdown = dom.locationDropdown;
    const isActive = dropdown.classList.contains('active');

    const newState = typeof forceState === 'boolean' ? forceState : !isActive;

    if (newState === isActive) return; // No change needed

    if (newState) {
      // Show dropdown
      dropdown.style.opacity = '0';
      dropdown.style.transform = 'translateY(-10px)';
      dropdown.classList.add('active');
      dropdown.offsetHeight; // Force reflow
      dropdown.style.opacity = '1';
      dropdown.style.transform = 'translateY(0)';
      dom.locationSearch.focus();
      handleSearch(); // Trigger initial search to show results
    } else {
      // Hide dropdown
      dropdown.style.opacity = '0';
      dropdown.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        dropdown.classList.remove('active');
        dropdown.style.opacity = '';
        dropdown.style.transform = '';
      }, 200);
    }
}

// --- Cookie Functions ---

function saveLocationToCookie(location) {
  document.cookie = `${LOCATION_COOKIE_KEY}=${encodeURIComponent(location)}; path=/; max-age=31536000`; // 1 year
}

function getLocationFromCookie() {
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${LOCATION_COOKIE_KEY}=`))
    ?.split('=')[1];
  return cookieValue ? decodeURIComponent(cookieValue) : null;
}

// --- Event Listeners ---

function setupEventListeners() {
    dom.locationSearch.addEventListener('input', handleSearch);
    dom.locationSearch.addEventListener('focus', handleSearch);
    dom.locationSearch.addEventListener('keydown', handleKeyNavigation);
    dom.locationContainer.addEventListener('click', (e) => {
        if (e.target !== dom.locationSearch && !dom.locationDropdown.contains(e.target)) {
            toggleLocationDropdown();
        }
    });
    dom.locationButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        toggleLocationDropdown(false); // Close dropdown
        await detectLocation();
        await updatePrayerTimesAndStartCountdown();
    });
    document.addEventListener('click', (e) => {
        if (!dom.locationContainer.contains(e.target)) {
          toggleLocationDropdown(false);
        }
    });
    window.addEventListener('resize', updateLocationTextDisplay);
    dom.themeToggle.addEventListener('click', toggleTheme);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        // Only update if user hasn't manually set a preference
        if (!localStorage.getItem(THEME_STORAGE_KEY)) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });
}

// --- Initialization ---
/** Initializes the application. */
async function initApp() {
    const savedLocation = getLocationFromCookie();
    if (savedLocation) {
      state.currentLocation = savedLocation;
      state.currentLocationDisplay = savedLocation.split(', ')[0];
      setLocationText(state.currentLocationDisplay);
    } else {
      await detectLocation();
    }
    await updatePrayerTimesAndStartCountdown();
    await fetchTurkishLocations();
    initTheme();
    captureOriginalStyles();
    setupInfoToggle();
    setupEventListeners();
    setInterval(determineTargetTime, 60000); // Update target time every minute.
}

// Start the app.
document.addEventListener('DOMContentLoaded', initApp);
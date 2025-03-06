# İmsakiye Web Application

## Overview

**İmsakiye** is a web application designed to provide accurate Iftar and Sahur times during the month of Ramadan.  It uses the user's location (either detected automatically via browser geolocation or IP address, or manually selected) to fetch prayer times from the Aladhan API and displays a countdown timer to the next Iftar or Sahur. The application offers a clean, user-friendly interface with both dark and light themes, catering to user preferences and accessibility needs.  It also includes responsive design for optimal viewing on various devices, from mobile phones to desktops. The application is specifically tailored for users in Turkey, providing a detailed list of cities and districts for precise location selection.

## Features

*   **Automatic Location Detection:**
    *   Uses browser geolocation (with user permission) for high-accuracy location.
    *   Falls back to IP-based location detection if geolocation is unavailable or denied.
    *   Provides a default location (Istanbul) if both methods fail.
*   **Manual Location Selection:**
    *   Offers a searchable dropdown list of Turkish cities and districts.
    *   Uses a custom dataset (`locations.json`) for comprehensive Turkish location data.
    *   Implements debounced search for efficient filtering of locations.
    *   Supports keyboard navigation (arrow keys, Enter, Escape) within the search results.
*   **Prayer Time Calculation:**
    *   Fetches prayer times from the Aladhan API using the Diyanet method (method 13, school 1).
    *   Automatically determines whether to count down to Iftar (Maghrib) or Sahur (Fajr) based on the current time.
    *   Handles edge cases like switching to the next day's Sahur time after Iftar.
*   **Dynamic Countdown Timer:**
    *   Displays a real-time countdown to the next Iftar or Sahur.
    *   Uses `requestAnimationFrame` for smooth and efficient updates.
    *   Provides visual feedback (animation) when the countdown values change.
    *   Displays an "İftar Vakti!" message when the Iftar time arrives, including visual and accessibility cues.
*   **Theme Support:**
    *   Offers both dark (default) and light themes.
    *   Remembers the user's theme preference using `localStorage`.
    *   Defaults to the user's system theme preference (using `prefers-color-scheme`).
    *   Includes a theme toggle button for easy switching.
*   **Responsive Design:**
    *   Adapts to different screen sizes (mobile, tablet, desktop) using CSS media queries.
    *   Optimized layout for landscape mode on mobile devices.
*   **Accessibility:**
    *   Uses semantic HTML elements for better structure and screen reader compatibility.
    *   Provides ARIA attributes (e.g., `aria-label`, `aria-live`, `role`) for improved screen reader experience.
    *   Implements focus management for keyboard navigation.
    *   Includes high contrast mode support.
    *   Respects user's `prefers-reduced-motion` setting.
*   **User-Friendly Interface:**
    *   Clean and intuitive design.
    *   Displays the current date in Turkish.
    *   Truncates long location names to fit within the display area, with a tooltip showing the full name.
    *   Includes a loading spinner during API requests.
    *   Provides clear error messages if prayer times cannot be fetched.
*   **Info Button:**
    * A button that shows/hides a message "Vakitlerin garantisi yoktur."

## How to Use

1.  **Location:**
    *   The application will attempt to detect your location automatically.
    *   If automatic detection fails or you want to select a different location, click on the location area (marked with a map marker icon).
    *   Type the name of a Turkish city or district in the search box.
    *   Select your location from the dropdown list.  You can also use the arrow keys and Enter to navigate and select.
    *   Alternatively, click the crosshairs button to attempt automatic location detection again.

2.  **Theme:**
    *   Click the moon/sun icon in the top-right corner to toggle between dark and light themes.

3.  **Countdown:**
    *   The countdown timer will automatically display the remaining time until the next Iftar or Sahur.
    *   The "İftar Vakti!" message will appear when it's time for Iftar.

4.  **Info:**
    *   Click the info icon in the top-left corner to show/hide the disclaimer message "Vakitlerin garantisi yoktur.".

## Operation Logic

1.  **Initialization:**
    *   On page load, the application:
        *   Sets the current date.
        *   Attempts to detect the user's location.
        *   Fetches prayer times for the detected or default location.
        *   Determines the next target time (Iftar or Sahur).
        *   Starts the countdown timer.
        *   Loads the Turkish location data.
        *   Initializes the theme (dark or light).
        *   Sets up event listeners.

2.  **Location Detection:**
    *   `detectLocation()`: Tries browser geolocation first.  If successful, `processGeolocation()` fetches the city name using reverse geocoding (Nominatim API).
    *   If geolocation fails, `getLocationFromIp()` uses the IP-API to get an approximate location.
    *   If both fail, `setDefaultLocation()` sets the location to Istanbul.

3.  **Prayer Time Fetching:**
    *   `getPrayerTimes(location)`: Fetches prayer times from the Aladhan API using the provided location.
    *   `updatePrayerTimesAndStartCountdown()`:  Called when the location changes or periodically.  It fetches prayer times, determines the target time, and starts/restarts the countdown.

4.  **Countdown:**
    *   `determineTargetTime()`: Calculates the time difference between now and the next Iftar or Sahur. Sets `state.targetTime`.
    *   `startCountdown()`:  Initiates the countdown loop using `requestAnimationFrame`.
    *   `updateCountdown()`:  Called repeatedly by `requestAnimationFrame`.  Calculates the remaining time, updates the display, and handles the "Iftar Vakti!" message.

5.  **Location Search:**
    *   `fetchTurkishLocations()`: Loads the `locations.json` file and preprocesses the data for efficient searching.
    *   `handleSearch()`:  A debounced function that filters the location list based on the user's input.
    *   `selectLocation(locationValue, displayName)`:  Called when the user selects a location.  Updates the location, fetches prayer times, and restarts the countdown.

6.  **Theme Handling:**
    * `initTheme()`: Initializes the theme on page load, first looks for a saved preference, otherwise will be based on system preference.
    *   `applyTheme(theme)`:  Applies the specified theme (dark or light) by adding/removing CSS classes.
    *   `toggleTheme()`:  Switches between dark and light themes.

7.  **Event Listeners:**
    *   Handle user interactions: location search input, location selection, location button click, theme toggle, window resize, and clicks outside the location dropdown.

## Technology Stack

*   **Frontend:**
    *   HTML5
    *   CSS3 (with CSS variables for theming)
    *   JavaScript (ES6+)
    *   Font Awesome (for icons)
    *   Google Fonts (Inter font)
*   **APIs:**
    *   Aladhan API (for prayer times)
    *   Nominatim API (for reverse geocoding)
    *   IP-API (for IP-based location lookup)
*   **Data:**
    *   `locations.json`: Custom JSON file containing Turkish city and district data.

## Setup

### Requirements

*   A modern web browser with JavaScript enabled (Chrome, Firefox, Safari, Edge, etc.).
*   An internet connection (for fetching prayer times and location data).

### Installation
This is a static web application, so there is no "installation" in the traditional sense. Just clone from github, or download files.

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/mdonmez/imsakiye.git
    ```
    
    or Download the ZIP file and extract it.

### Configuration

*   **`locations.json`:**  This file contains the list of Turkish cities and districts. You can modify this file to update or extend the location data.  The structure is:

    ```json
    {
        "City Name": ["District 1", "District 2", ...],
        "Another City": ["District A", "District B", ...]
        ...
    }
    ```

    If a district has the same name as the city, it is only listed once (under the city).

### Usage

Create a http server and use the app.
Or just to to the hosted demo version: 

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
// ========================================
// WeatherFlow - Modern Weather Dashboard
// Enhanced JavaScript with Animations
// ========================================

// DOM Elements
const elements = {
    cityInput: document.querySelector(".city-input"),
    searchBtn: document.querySelector(".search-btn"),
    locationBtn: document.querySelector(".location-btn"),
    loadingState: document.getElementById("loading-state"),
    errorState: document.getElementById("error-state"),
    emptyState: document.getElementById("empty-state"),
    weatherData: document.getElementById("weather-data"),
    currentTime: document.getElementById("current-time"),
    currentDate: document.getElementById("current-date"),
    toast: document.getElementById("toast"),
    toastMessage: document.querySelector(".toast-message"),
    particles: document.getElementById("particles")
};

// State
let currentWeatherData = null;
let activeRequestId = 0;

// Initialize App
function init() {
    createParticles();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    setupEventListeners();
    showEmptyState();
}

// Create Animated Background Particles
function createParticles() {
    const particleCount = 15;
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.width = particle.style.height = (Math.random() * 100 + 50) + 'px';
        particle.style.animationDelay = Math.random() * 20 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 15) + 's';
        elements.particles.appendChild(particle);
    }
}

// Update Date and Time
function updateDateTime() {
    const now = new Date();
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    
    elements.currentTime.textContent = now.toLocaleTimeString('en-US', timeOptions);
    elements.currentDate.textContent = now.toLocaleDateString('en-US', dateOptions);
}

// Setup Event Listeners
function setupEventListeners() {
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.cityInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    elements.locationBtn.addEventListener('click', handleLocation);
    document.querySelector('.retry-btn')?.addEventListener('click', retryFetch);
}

// Show States
function showEmptyState() {
    hideAllStates();
    elements.emptyState.style.display = 'flex';
}

function showLoadingState() {
    hideAllStates();
    elements.loadingState.style.display = 'flex';
}

function showErrorState(message = 'Unable to fetch weather data. Please try again.') {
    hideAllStates();
    elements.errorState.querySelector('p').textContent = message;
    elements.errorState.style.display = 'flex';
}

function showWeatherData() {
    hideAllStates();
    elements.weatherData.style.display = 'flex';
}

function hideAllStates() {
    elements.loadingState.style.display = 'none';
    elements.errorState.style.display = 'none';
    elements.emptyState.style.display = 'none';
    elements.weatherData.style.display = 'none';
}

// Show Toast Notification
function showToast(message, duration = 3000) {
    elements.toastMessage.textContent = message;
    elements.toast.classList.add('show');
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, duration);
}

// Handle Search
function handleSearch() {
    const cityName = elements.cityInput.value.trim();
    if (!cityName) {
        showToast('Please enter a city name');
        return;
    }
    getCityCoordinates(cityName);
}

// Handle Location
function handleLocation() {
    if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser');
        return;
    }

    const requestId = startWeatherRequest();

    navigator.geolocation.getCurrentPosition(
        (position) => {
            if (requestId !== activeRequestId) return;
            const { latitude, longitude } = position.coords;
            reverseGeocode(latitude, longitude, requestId);
        },
        (error) => {
            if (requestId !== activeRequestId) return;
            showErrorState();
            let errorMessage = 'Unable to get your location. ';
            if (error.code === error.PERMISSION_DENIED) {
                errorMessage += 'Location permission denied.';
            } else if (error.code === error.POSITION_UNAVAILABLE) {
                errorMessage += 'Location information unavailable.';
            } else if (error.code === error.TIMEOUT) {
                errorMessage += 'Location request timed out.';
            }
            showToast(errorMessage);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
        }
    );
}

// Fetch JSON and preserve useful API error details for the error state.
async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Weather service returned ${response.status}`);
    return response.json();
}

function startWeatherRequest() {
    showLoadingState();
    return ++activeRequestId;
}

// Get City Coordinates
async function getCityCoordinates(cityName) {
    const requestId = startWeatherRequest();
    try {
        const query = encodeURIComponent(cityName.split(',')[0].trim());
        const data = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=10&language=en&format=json`);
        if (requestId !== activeRequestId) return;
        const places = data.results || [];
        if (!places.length) throw new Error(`No location found for "${cityName}". Try adding a country.`);

        const parts = cityName.split(',').map(part => part.trim().toLocaleLowerCase());
        const place = places.find(item => item.name.toLocaleLowerCase() === parts[0] &&
            (!parts[1] || item.country?.toLocaleLowerCase() === parts[1] || item.country_code?.toLocaleLowerCase() === parts[1])) || places[0];
        const displayName = [place.name, place.admin1, place.country].filter(Boolean).join(', ');
        await getWeatherDetails(displayName, place.latitude, place.longitude, requestId);
    } catch (error) {
        if (requestId !== activeRequestId) return;
        showErrorState(error.message || 'Could not find that location. Check the spelling and try again.');
    }
}

// Handle current location without requiring a separate reverse-geocoding service.
function reverseGeocode(lat, lon, requestId) {
    getWeatherDetails('Your Location', lat, lon, requestId);
}

// Open-Meteo provides current observations and a daily forecast without an API key.
async function getWeatherDetails(cityName, latitude, longitude, requestId = startWeatherRequest()) {
    const params = new URLSearchParams({
        latitude,
        longitude,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,visibility',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_probability_max',
        forecast_days: '6',
        timezone: 'auto',
        temperature_unit: 'celsius',
        wind_speed_unit: 'ms'
    });

    try {
        const data = await fetchJson(`https://api.open-meteo.com/v1/forecast?${params}`);
        if (requestId !== activeRequestId) return;
        if (!data.current || !data.daily?.time?.length) throw new Error('The weather service returned incomplete data.');
        processWeatherData(cityName, data);
    } catch (error) {
        if (requestId !== activeRequestId) return;
        showErrorState(error.message || 'Could not load weather. Check your connection and try again.');
    }
}

function weatherDescription(code) {
    if (code === 0) return 'Clear sky';
    if (code === 1) return 'Mainly clear';
    if (code === 2) return 'Partly cloudy';
    if (code === 3) return 'Overcast';
    if (code === 45 || code === 48) return 'Fog';
    if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle';
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow';
    if ([95, 96, 99].includes(code)) return 'Thunderstorm';
    return 'Unknown conditions';
}

function weatherIcon(code, isDay = true) {
    const day = isDay ? 'd' : 'n';
    if (code === 0) return `01${day}`;
    if (code === 1) return `02${day}`;
    if (code === 2) return `03${day}`;
    if (code === 3) return `04${day}`;
    if (code === 45 || code === 48) return `50${day}`;
    if ([51, 53, 55, 56, 57].includes(code)) return `09${day}`;
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return `10${day}`;
    if ([71, 73, 75, 77, 85, 86].includes(code)) return `13${day}`;
    if ([95, 96, 99].includes(code)) return `11${day}`;
    return `02${day}`;
}

function processWeatherData(cityName, data) {
    updateCurrentWeather(cityName, data);
    updateForecastCards(data.daily);
    showWeatherData();
    showToast(`Weather updated for ${cityName}`);
}

function updateCurrentWeather(cityName, data) {
    const current = data.current;
    const code = current.weather_code;
    document.querySelector('.city-text').textContent = cityName;
    document.querySelector('.temp-value').textContent = Math.round(current.temperature_2m);
    document.querySelector('.description-text').textContent = weatherDescription(code);
    document.querySelector('.forecast-date').textContent = formatDate(new Date(`${current.time.split('T')[0]}T00:00:00Z`), true);
    document.querySelector('.weather-icon-large').src = `https://openweathermap.org/img/wn/${weatherIcon(code, current.is_day === 1)}@4x.png`;
    document.querySelector('.weather-icon-large').alt = weatherDescription(code);
    document.querySelector('.wind-speed').textContent = `${Number(current.wind_speed_10m).toFixed(1)} m/s`;
    document.querySelector('.humidity').textContent = `${current.relative_humidity_2m}%`;
    document.querySelector('.feels-like').textContent = `${Math.round(current.apparent_temperature)}°C`;
    document.querySelector('.visibility').textContent = Number.isFinite(current.visibility)
        ? `${(current.visibility / 1000).toFixed(1)} km`
        : 'Unavailable';
}

function updateForecastCards(daily) {
    const container = document.querySelector('.forecast-cards');
    container.innerHTML = '';
    daily.time.slice(1, 6).forEach((day, index) => {
        const code = daily.weather_code[index + 1];
        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.style.animationDelay = `${index * 0.1}s`;
        card.innerHTML = `
            <div class="forecast-date">${formatDate(new Date(`${day}T00:00:00Z`), true)}</div>
            <img class="forecast-icon" src="https://openweathermap.org/img/wn/${weatherIcon(code)}@2x.png" alt="${weatherDescription(code)}">
            <div class="forecast-temp">${Math.round(daily.temperature_2m_max[index + 1])}°C</div>
            <div class="forecast-details">
                <div class="forecast-wind"><i class="fas fa-wind"></i><span>${Number(daily.wind_speed_10m_max[index + 1]).toFixed(1)} m/s</span></div>
                <div class="forecast-humidity"><i class="fas fa-cloud-rain"></i><span>${daily.precipitation_probability_max[index + 1] ?? 0}% rain</span></div>
            </div>
        `;
        container.appendChild(card);
    });
}

// Format Date
function formatDate(date, useUTC = false) {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    if (useUTC) options.timeZone = 'UTC';
    return date.toLocaleDateString('en-US', options);
}
// Retry Fetch
function retryFetch() {
    const lastCity = elements.cityInput.value.trim();
    if (lastCity) {
        handleSearch();
    } else {
        handleLocation();
    }
}

// Add staggered animation to forecast cards
function addStaggeredAnimation() {
    const cards = document.querySelectorAll('.forecast-card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Smooth scroll reveal
function revealOnScroll() {
    const reveals = document.querySelectorAll('.current-weather-card, .forecast-section');
    
    reveals.forEach(element => {
        const windowHeight = window.innerHeight;
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;
        
        if (elementTop < windowHeight - elementVisible) {
            element.classList.add('active');
        }
    });
}

// Add hover effects with JavaScript for smoother transitions
function addInteractiveEffects() {
    // Temperature value animation
    const tempValue = document.querySelector('.temp-value');
    if (tempValue) {
        tempValue.addEventListener('mouseenter', () => {
            tempValue.style.transform = 'scale(1.05)';
            tempValue.style.transition = 'transform 0.3s ease';
        });
        
        tempValue.addEventListener('mouseleave', () => {
            tempValue.style.transform = 'scale(1)';
        });
    }
    
    // Detail items hover effect
    const detailItems = document.querySelectorAll('.detail-item');
    detailItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            const icon = item.querySelector('.detail-icon i');
            if (icon) {
                icon.style.transform = 'rotate(15deg) scale(1.2)';
                icon.style.transition = 'all 0.3s ease';
            }
        });
        
        item.addEventListener('mouseleave', () => {
            const icon = item.querySelector('.detail-icon i');
            if (icon) {
                icon.style.transform = 'rotate(0deg) scale(1)';
            }
        });
    });
}

// Keyboard navigation
function setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        // Focus search on '/' key
        if (e.key === '/' && document.activeElement !== elements.cityInput) {
            e.preventDefault();
            elements.cityInput.focus();
        }
        
        // Escape to blur
        if (e.key === 'Escape') {
            document.activeElement.blur();
        }
    });
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    init();
    setupKeyboardNavigation();
    
    // Add scroll listener for reveal animations
    window.addEventListener('scroll', revealOnScroll);
    
    // Add interactive effects after weather data loads
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                const weatherData = document.getElementById('weather-data');
                if (weatherData.style.display !== 'none') {
                    addInteractiveEffects();
                    addStaggeredAnimation();
                }
            }
        });
    });
    
    observer.observe(document.getElementById('weather-data'), { childList: true, subtree: true });
});

// Handle visibility change for performance
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause animations when tab is not visible
        document.querySelectorAll('.particle').forEach(p => {
            p.style.animationPlayState = 'paused';
        });
    } else {
        // Resume animations
        document.querySelectorAll('.particle').forEach(p => {
            p.style.animationPlayState = 'running';
        });
    }
});

// Service Worker for offline capability (optional enhancement)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Uncomment below to enable service worker
        // navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
}

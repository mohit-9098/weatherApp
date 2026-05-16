// ========================================
// WeatherFlow - Modern Weather Dashboard
// Enhanced JavaScript with Animations
// ========================================

// API Configuration
const API_KEY = "a7b7c735c5d47bf0fa667c7168fce7dd"; // OpenWeatherMap API Key

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

function showErrorState() {
    hideAllStates();
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

    showLoadingState();

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            reverseGeocode(latitude, longitude);
        },
        (error) => {
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

// Get City Coordinates
function getCityCoordinates(cityName) {
    showLoadingState();
    
    const API_URL = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cityName)}&limit=1&appid=${API_KEY}`;
    
    fetch(API_URL)
        .then(response => {
            if (!response.ok) throw new Error('City not found');
            return response.json();
        })
        .then(data => {
            if (!data.length) {
                showErrorState();
                showToast(`No coordinates found for "${cityName}"`);
                return;
            }
            const { lat, lon, name, country } = data[0];
            const displayName = country ? `${name}, ${country}` : name;
            getWeatherDetails(displayName, lat, lon);
        })
        .catch(() => {
            showErrorState();
            showToast('Error fetching city data. Please try again.');
        });
}

// Reverse Geocode
function reverseGeocode(lat, lon) {
    const API_URL = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`;
    
    fetch(API_URL)
        .then(response => response.json())
        .then(data => {
            if (!data.length) {
                getWeatherDetails('Your Location', lat, lon);
                return;
            }
            const { name, country } = data[0];
            const displayName = country ? `${name}, ${country}` : name;
            getWeatherDetails(displayName, lat, lon);
        })
        .catch(() => {
            getWeatherDetails('Your Location', lat, lon);
        });
}

// Get Weather Details
function getWeatherDetails(cityName, latitude, longitude) {
    const WEATHER_API_URL = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`;
    
    fetch(WEATHER_API_URL)
        .then(response => {
            if (!response.ok) throw new Error('Weather data unavailable');
            return response.json();
        })
        .then(data => {
            if (!data.list || !data.list.length) {
                showErrorState();
                showToast('No weather data available for this location');
                return;
            }
            
            processWeatherData(cityName, data);
        })
        .catch(() => {
            showErrorState();
            showToast('Error fetching weather data. Please try again.');
        });
}

// Process Weather Data
function processWeatherData(cityName, data) {
    // Filter to get one forecast per day (around noon)
    const dailyForecasts = [];
    const seenDates = new Set();
    
    data.list.forEach(forecast => {
        const date = new Date(forecast.dt * 1000);
        const dateStr = date.toDateString();
        
        if (!seenDates.has(dateStr)) {
            seenDates.add(dateStr);
            dailyForecasts.push(forecast);
        }
        
        if (dailyForecasts.length >= 5) return;
    });

    // Update UI
    updateCurrentWeather(cityName, dailyForecasts[0]);
    updateForecastCards(dailyForecasts.slice(1));
    
    showWeatherData();
    showToast(`Weather updated for ${cityName}`);
}

// Update Current Weather
function updateCurrentWeather(cityName, weatherItem) {
    const temp = weatherItem.main.temp;
    const feelsLike = weatherItem.main.feels_like;
    const humidity = weatherItem.main.humidity;
    const windSpeed = weatherItem.wind.speed;
    const description = weatherItem.weather[0].description;
    const icon = weatherItem.weather[0].icon;
    const date = new Date(weatherItem.dt * 1000);
    
    // Update DOM elements
    document.querySelector('.city-text').textContent = cityName;
    document.querySelector('.temp-value').textContent = Math.round(temp);
    document.querySelector('.description-text').textContent = description;
    document.querySelector('.forecast-date').textContent = formatDate(date);
    document.querySelector('.weather-icon-large').src = `https://openweathermap.org/img/wn/${icon}@4x.png`;
    document.querySelector('.weather-icon-large').alt = description;
    
    // Update details
    document.querySelector('.wind-speed').textContent = `${windSpeed.toFixed(1)} m/s`;
    document.querySelector('.humidity').textContent = `${humidity}%`;
    document.querySelector('.feels-like').textContent = `${Math.round(feelsLike)}°C`;
    document.querySelector('.visibility').textContent = '10 km'; // Default visibility
}

// Update Forecast Cards
function updateForecastCards(forecasts) {
    const container = document.querySelector('.forecast-cards');
    container.innerHTML = '';
    
    forecasts.forEach((forecast, index) => {
        const temp = forecast.main.temp;
        const humidity = forecast.main.humidity;
        const windSpeed = forecast.wind.speed;
        const icon = forecast.weather[0].icon;
        const date = new Date(forecast.dt * 1000);
        
        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.style.animationDelay = `${index * 0.1}s`;
        card.innerHTML = `
            <div class="forecast-date">${formatDate(date)}</div>
            <img class="forecast-icon" src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="Weather icon">
            <div class="forecast-temp">${Math.round(temp)}°C</div>
            <div class="forecast-details">
                <div class="forecast-wind">
                    <i class="fas fa-wind"></i>
                    <span>${windSpeed.toFixed(1)} m/s</span>
                </div>
                <div class="forecast-humidity">
                    <i class="fas fa-tint"></i>
                    <span>${humidity}%</span>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
}

// Format Date
function formatDate(date) {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
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
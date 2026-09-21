// Application state (in-memory)
const appState = {
  examStartTime: null,
  submissionInterval: 10, // minutes
  initialWaitTime: 30, // minutes
  submissionWindowDuration: 1, // minutes (configurable)
  statusBarEnabled: false, // default: hidden
  language: 'nl' // 'nl' or 'en'
};

// Student-facing texts per language
const translations = {
  nl: {
    locale: 'nl-BE',
    notStarted: 'Examen nog niet gestart',
    canSubmit: 'Je mag nu afgeven!',
    nextSubmission: (n) => `Volgende afgeefmoment over ${n} ${n === 1 ? 'minuut' : 'minuten'}`,
    toggleLabel: 'EN',
    toggleAria: 'Switch to English'
  },
  en: {
    locale: 'en-GB',
    notStarted: 'Exam not started yet',
    canSubmit: 'You may submit now!',
    nextSubmission: (n) => `Next submission moment in ${n} ${n === 1 ? 'minute' : 'minutes'}`,
    toggleLabel: 'NL',
    toggleAria: 'Schakel naar Nederlands'
  }
};

function t() {
  return translations[appState.language];
}

// Parse URL parameters
function parseURLParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  const params = {};

  // Parse start time (HH:MM format)
  if (urlParams.has('start')) {
    const startParam = urlParams.get('start');
    const timeMatch = startParam.match(/^(\d{1,2}):(\d{2})$/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        params.start = startParam;
      }
    }
  }

  // Parse interval (positive integer)
  if (urlParams.has('interval')) {
    const interval = parseInt(urlParams.get('interval'), 10);
    if (!isNaN(interval) && interval > 0) {
      params.interval = interval;
    }
  }

  // Parse duration (positive integer)
  if (urlParams.has('duration')) {
    const duration = parseInt(urlParams.get('duration'), 10);
    if (!isNaN(duration) && duration > 0) {
      params.duration = duration;
    }
  }

  // Parse show (1/true or 0/false)
  if (urlParams.has('show')) {
    const showParam = urlParams.get('show');
    params.show = (showParam === '1' || showParam === 'true');
  }

  // Parse language (nl or en)
  if (urlParams.has('lang')) {
    const langParam = urlParams.get('lang').toLowerCase();
    if (translations[langParam]) {
      params.lang = langParam;
    }
  }

  return params;
}

// Update URL with current settings
function updateURL() {
  const params = new URLSearchParams();

  // Format start time as HH:MM
  if (appState.examStartTime) {
    const hours = String(appState.examStartTime.getHours()).padStart(2, '0');
    const minutes = String(appState.examStartTime.getMinutes()).padStart(2, '0');
    params.set('start', `${hours}:${minutes}`);
  }

  // Add interval
  params.set('interval', appState.submissionInterval.toString());

  // Add duration
  params.set('duration', appState.submissionWindowDuration.toString());

  // Add show status (1 or 0)
  params.set('show', appState.statusBarEnabled ? '1' : '0');

  // Add language
  params.set('lang', appState.language);

  // Update URL without reloading page
  const newURL = `${window.location.pathname}?${params.toString()}`;
  history.replaceState(null, '', newURL);
}

// Initialize with default start time (current time) or from URL
function initializeDefaultStartTime() {
  const urlParams = parseURLParameters();

  let startTime;
  if (urlParams.start) {
    // Use time from URL
    const [hours, minutes] = urlParams.start.split(':').map(num => parseInt(num, 10));
    startTime = new Date();
    startTime.setHours(hours, minutes, 0, 0);
  } else {
    // Default to current time
    startTime = new Date();
  }

  const hours = String(startTime.getHours()).padStart(2, '0');
  const minutes = String(startTime.getMinutes()).padStart(2, '0');
  document.getElementById('startTime').value = `${hours}:${minutes}`;

  // Set initial exam start time
  appState.examStartTime = startTime;
}

// Update date and time display
function updateDateTime() {
  const now = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };
  document.getElementById('datetime').textContent = now.toLocaleString(t().locale, options);
}

// Calculate exam status
function calculateExamStatus() {
  if (!appState.examStartTime) {
    return {
      state: 'not-started',
      message: t().notStarted
    };
  }

  const now = new Date();
  const minutesSinceStart = (now - appState.examStartTime) / (1000 * 60);

  // Before exam starts
  if (minutesSinceStart < 0) {
    return {
      state: 'not-started',
      message: t().notStarted
    };
  }

  // Initial waiting period (0-30 minutes)
  if (minutesSinceStart < appState.initialWaitTime) {
    const minutesRemaining = Math.ceil(appState.initialWaitTime - minutesSinceStart);
    return {
      state: 'waiting',
      message: t().nextSubmission(minutesRemaining)
    };
  }

  // After initial wait, calculate submission windows
  const minutesAfterInitialWait = minutesSinceStart - appState.initialWaitTime;
  const cyclePosition = minutesAfterInitialWait % appState.submissionInterval;

  // Within submission window (first X minutes of each interval)
  if (cyclePosition < appState.submissionWindowDuration) {
    return {
      state: 'can-submit',
      message: t().canSubmit
    };
  }

  // Between submission windows
  const minutesUntilNext = Math.ceil(appState.submissionInterval - cyclePosition);
  return {
    state: 'waiting',
    message: t().nextSubmission(minutesUntilNext)
  };
}

// Update status bar
function updateStatusBar() {
  const statusBar = document.getElementById('statusBar');
  const imageContainer = document.querySelector('.image-container');

  // Handle status bar visibility
  if (!appState.statusBarEnabled) {
    statusBar.classList.add('hidden');
    imageContainer.classList.add('status-bar-hidden');
    return;
  }

  statusBar.classList.remove('hidden');
  imageContainer.classList.remove('status-bar-hidden');

  const status = calculateExamStatus();

  // Remove all state classes
  statusBar.className = 'status-bar';

  // Add current state class
  statusBar.classList.add(status.state);

  // Update message
  statusBar.textContent = status.message;
}

// Apply current language to slide, toggle button and bars
function applyLanguage() {
  document.documentElement.lang = appState.language;
  document.querySelector('.image-container').classList.toggle('lang-en', appState.language === 'en');

  const languageButton = document.getElementById('languageButton');
  languageButton.textContent = t().toggleLabel;
  languageButton.setAttribute('aria-label', t().toggleAria);

  updateDateTime();
  updateStatusBar();
}

function toggleLanguage() {
  appState.language = appState.language === 'nl' ? 'en' : 'nl';
  updateURL();
  applyLanguage();
}

// Settings modal handlers
function openSettingsModal() {
  document.getElementById('settingsModal').classList.add('active');
}

function closeSettingsModal() {
  document.getElementById('settingsModal').classList.remove('active');
}

function saveSettings() {
  const startTimeInput = document.getElementById('startTime').value;
  const intervalInput = parseInt(document.getElementById('submissionInterval').value, 10);
  const durationInput = parseInt(document.getElementById('submissionDuration').value, 10);
  const statusBarToggle = document.getElementById('statusBarToggle').checked;

  // Parse start time
  const [hours, minutes] = startTimeInput.split(':').map(num => parseInt(num, 10));
  const startTime = new Date();
  startTime.setHours(hours, minutes, 0, 0);

  // Update app state
  appState.examStartTime = startTime;
  appState.submissionInterval = intervalInput;
  appState.submissionWindowDuration = durationInput;
  appState.statusBarEnabled = statusBarToggle;

  // Update URL with new settings
  updateURL();

  // Close modal
  closeSettingsModal();

  // Immediate update
  updateStatusBar();
}

// Event listeners
document.getElementById('languageButton').addEventListener('click', toggleLanguage);
document.getElementById('cancelButton').addEventListener('click', closeSettingsModal);
document.getElementById('saveButton').addEventListener('click', saveSettings);

// Close modal when clicking outside
document.getElementById('settingsModal').addEventListener('click', function (e) {
  if (e.target === this) {
    closeSettingsModal();
  }
});

// Load settings into form when opening modal
function loadSettingsToForm() {
  // Load all current settings into form
  if (appState.examStartTime) {
    const hours = String(appState.examStartTime.getHours()).padStart(2, '0');
    const minutes = String(appState.examStartTime.getMinutes()).padStart(2, '0');
    document.getElementById('startTime').value = `${hours}:${minutes}`;
  }
  document.getElementById('submissionInterval').value = appState.submissionInterval;
  document.getElementById('submissionDuration').value = appState.submissionWindowDuration;
  document.getElementById('statusBarToggle').checked = appState.statusBarEnabled;
}

// Update settings button event to load current values
document.getElementById('settingsButton').addEventListener('click', function () {
  loadSettingsToForm();
  openSettingsModal();
});

// Initialize from URL parameters or defaults
function initializeFromURL() {
  const urlParams = parseURLParameters();

  // Apply URL parameters to app state
  if (urlParams.interval !== undefined) {
    appState.submissionInterval = urlParams.interval;
  }

  if (urlParams.duration !== undefined) {
    appState.submissionWindowDuration = urlParams.duration;
  }

  if (urlParams.show !== undefined) {
    appState.statusBarEnabled = urlParams.show;
  }

  if (urlParams.lang !== undefined) {
    appState.language = urlParams.lang;
  }

  // Initialize start time (from URL or default)
  initializeDefaultStartTime();
}

// Initialize
initializeFromURL();
applyLanguage();

// Update every second
setInterval(() => {
  updateDateTime();
  updateStatusBar();
}, 1000);

/**
 * Custom navigation and dark mode toggle functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // Create and add dark mode toggle button
    createDarkModeToggle();
    
    // Initialize theme based on localStorage or system preference
    initializeTheme();
    
    // Ensure navigation is properly displayed and centered
    ensureNavigationVisibility();
});

function createDarkModeToggle() {
    const masthead = document.querySelector('.masthead__inner-wrap');
    if (!masthead) return;
    
    // Create toggle container
    const toggleContainer = document.createElement('div');
    toggleContainer.className = 'dark-toggle';
    
    // Create toggle button
    const toggleButton = document.createElement('button');
    toggleButton.className = 'dark-toggle__button';
    toggleButton.setAttribute('aria-label', 'Toggle dark mode');
    
    // Set initial button text
    updateToggleButtonText(toggleButton);
    
    // Add click event
    toggleButton.addEventListener('click', function() {
        toggleDarkMode();
        updateToggleButtonText(toggleButton);
    });
    
    toggleContainer.appendChild(toggleButton);
    masthead.appendChild(toggleContainer);
}

function toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update body class for backward compatibility
    if (newTheme === 'dark') {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
}

function updateToggleButtonText(button) {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        button.innerHTML = '☀️ Light';
    } else {
        button.innerHTML = '🌙 Dark';
    }
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    let theme = savedTheme;
    if (!theme) {
        theme = systemPrefersDark ? 'dark' : 'light';
    }
    
    document.documentElement.setAttribute('data-theme', theme);
    
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    }
    
    // Update toggle button if it exists
    const toggleButton = document.querySelector('.dark-toggle__button');
    if (toggleButton) {
        updateToggleButtonText(toggleButton);
    }
}

function ensureNavigationVisibility() {
    // Ensure visible links are always displayed
    const visibleLinks = document.querySelector('.visible-links');
    if (visibleLinks) {
        visibleLinks.style.display = 'flex';
        visibleLinks.style.visibility = 'visible';
        visibleLinks.style.opacity = '1';
    }
    
    // Hide the greedy nav toggle to prevent collapsing
    const greedyToggle = document.querySelector('.greedy-nav__toggle');
    if (greedyToggle) {
        greedyToggle.style.display = 'none';
    }
    
    // Hide hidden links container
    const hiddenLinks = document.querySelector('.hidden-links');
    if (hiddenLinks) {
        hiddenLinks.style.display = 'none';
    }
    
    // Center the navigation
    const greedyNav = document.querySelector('.greedy-nav');
    if (greedyNav) {
        greedyNav.style.display = 'flex';
        greedyNav.style.justifyContent = 'center';
        greedyNav.style.alignItems = 'center';
    }
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
    if (!localStorage.getItem('theme')) {
        const newTheme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        
        const toggleButton = document.querySelector('.dark-toggle__button');
        if (toggleButton) {
            updateToggleButtonText(toggleButton);
        }
    }
});

// Ensure navigation stays visible on window resize
window.addEventListener('resize', function() {
    ensureNavigationVisibility();
});

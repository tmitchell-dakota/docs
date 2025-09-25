// Global authentication validation script - Simple group-level access control
(function() {
  'use strict';

  // Configuration
  const AUTH_CONFIG = {
    tokenKey: 'access_token',
    timestampKey: 'token_timestamp',
    groupsKey: 'accessible_objects',
    maxAge: 60 * 60 * 1000, // 1 hour
    loginPath: '/login',
    loaderPaths: ['/', '/api-reference'],
    // Simple group access control - add all endpoints here
    endpointGroups: {
      '/api-reference/endpoint/auth': null,
      '/api-reference/endpoint/accounts': 'account',
      '/api-reference/endpoint/contacts': 'contact',
      '/api-reference/endpoint/metro-area': 'metro_area__c',
      '/api-reference/endpoint/marketplace-searches': 'marketplace_searches__c',
      '/api-reference/endpoint/conference': 'conference__c',
      '/api-reference/endpoint/investment': 'investment__c',
      '/api-reference/endpoint/investment-strategy': 'investment_strategy__c',
      '/api-reference/endpoint/manager-presentation': 'manager_presentation__c',
      '/api-reference/endpoint/public-plan-minutes': 'public_plan_minute__c',
      '/api-reference/endpoint/member-comments': 'member_comments__c',
      '/api-reference/endpoint/dakota-content': 'dakota_content__c',
      '/api-reference/endpoint/dakota-news': 'dakota_news__c',
      '/api-reference/endpoint/updates': 'updates',
      '/api-reference/endpoint/custom-account-contact-relation': 'custom_accountcontactrelation',
      
      // Field page restrictions - similar to API endpoints
      '/fields/Account': 'account',
      '/fields/Contact': 'contact',
      '/fields/MetroArea': 'metro_area__c',
      '/fields/MarketplaceSearches': 'marketplace_searches__c',
      '/fields/Investment': 'investment__c',
      '/fields/PublicPlanMinutes': 'public_plan_minute__c',
      '/fields/Conference': 'conference__c',
      '/fields/ManagerPresentation': 'manager_presentation__c'
    }
  };
  
  let ACCESSIBLE_OBJECTS = null;
  
  // Global Loader Functions
  function createGlobalLoader() {
    if (document.getElementById('auth-global-loader')) return;
    
    const loaderHTML = `
      <div id="auth-global-loader" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        // background: black;
        backdrop-filter: blur(30px);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem;
          background: white;
          border-radius: 12px;
          min-width: 200px;
          background: transparent;
        ">
          <div style="
            width: 40px;
            height: 40px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #0A9CE8;
            border-radius: 50%;
            animation: auth-spin 1s linear infinite;
            margin-bottom: 1rem;
          "></div
        </div>
      </div>
      <style>
        @keyframes auth-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    
    document.body.insertAdjacentHTML('afterbegin', loaderHTML);
  }
  
  function showGlobalLoader() {
    createGlobalLoader();
    const loader = document.getElementById('auth-global-loader');
    if (loader) {
      loader.style.display = 'flex';
      // Hide the main content to prevent flicker
      document.body.style.visibility = 'hidden';
      // Make loader visible
      const loaderElement = document.getElementById('auth-global-loader');
      if (loaderElement) {
        loaderElement.style.visibility = 'visible';
      }
      
      // Record the start time for minimum display duration
      loader.startTime = Date.now();
    }
  }
  
  function hideGlobalLoader() {
    const loader = document.getElementById('auth-global-loader');
    if (loader) {
      const elapsedTime = Date.now() - (loader.startTime || 0);
      const minDisplayTime = 500; // 0.5 seconds minimum
      
      if (elapsedTime < minDisplayTime) {
        // If less than 2 seconds have passed, wait for the remaining time
        const remainingTime = minDisplayTime - elapsedTime;
        setTimeout(() => {
          hideGlobalLoader();
        }, remainingTime);
        return;
      }
      
      // Show main content
      document.body.style.visibility = 'visible';
      // Fade out loader
      loader.style.transition = 'opacity 0.3s ease-out';
      loader.style.opacity = '0';
      setTimeout(() => {
        if (loader.parentNode) {
          loader.parentNode.removeChild(loader);
        }
      }, 300);
    }
  }
  
  function shouldShowLoaderForPath(pathname) {
    try {
      function normalize(p) {
        if (!p) return '/';
        if (p.length > 1 && p.endsWith('/')) return p.slice(0, -1);
        return p;
      }
      const current = normalize(pathname);
      return AUTH_CONFIG.loaderPaths.some(function(path) {
        return normalize(path) === current;
      });
    } catch (_) {
      console.log('shouldShowLoaderForPath', 'no');
      return false;
    }

  }
  
  function getPathnameFromArg(arg) {
    try {
      if (!arg) return window.location.pathname;
      const url = new URL(arg, window.location.origin);
      return url.pathname;
    } catch (_) {
      return window.location.pathname;
    }
  }
  
  // Generate login HTML
  function generateLoginHTML() {
    return `<!DOCTYPE html>
<html lang="en" class="${document.documentElement.className}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dakota Documentation Login</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    :root {
      --bg-light: linear-gradient(135deg, #f2f2f2 0%, #edf8fd 100%);
      --panel-light: #ffffff;
      --text-light: #111827; /* gray-900 */
      --muted-light: #374151; /* gray-700 */
      --border-light: #e5e7eb; /* gray-200 */
      --primary: #0A9CE8;
      --primary-hover: #0884c7;
      --error-bg: #fef2f2;
      --error-text: #dc2626;
      --error-border: #fecaca;
      --success-bg: #f0fdf4;
      --success-text: #16a34a;
      --success-border: #bbf7d0;
    }
    
    .dark {
      --bg-light: #090c0f;
      --text-light: #ffffff;
      --muted-light: #d1d5db; /* gray-300 */
      --border-light: rgba(255,255,255,0.08);
      --primary: #349ce8;
      --primary-hover: #2b8fd6;
      --error-bg: rgba(220,38,38,0.1);
      --error-text: #f87171;
      --error-border: rgba(248,113,113,0.3);
      --success-bg: rgba(34,197,94,0.1);
      --success-text: #86efac;
      --success-border: rgba(134,239,172,0.3);
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-light);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      visibility: visible !important;
      color: var(--text-light);
    }
    
    .login-container {
      background: var(--panel-light);
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      padding: 3rem;
      width: 100%;
      max-width: 400px;
      text-align: center;
      border: 1px solid var(--border-light);
    }
    .dark .login-container {
      background: var(--bg-light);
      /* stronger shadow and subtle outline to separate from page */
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
      border: 1px solid var(--border-light);
    }
    
    .logo-container {
      margin-bottom: 1rem;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    .logo {
      max-width: 200px;
      height: auto;
      object-fit: contain;
      filter: invert(0);
    }
    .dark .logo { filter: invert(1) hue-rotate(180deg) saturate(0.8); }
    
    .subtitle {
      color: var(--muted-light);
      font-size: 1.2rem;
      margin-bottom: 1.5rem;
      font-weight: 500;
    }
    
    .form-group {
      margin-bottom: 1.5rem;
      text-align: left;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--text-light);
      font-weight: 500;
    }
    
    .form-group input {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid var(--border-light);
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.3s, background-color 0.3s, color 0.3s;
      background: transparent;
      color: var(--text-light);
    }
    
    .form-group input:focus {
      outline: none;
      border-color: var(--primary);
    }
    
    .login-btn {
      width: 100%;
      background: var(--primary);
      color: white;
      border: none;
      padding: 0.75rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.3s;
      margin-bottom: 1rem;
    }
    
    .login-btn:hover:not(:disabled) {
      background: var(--primary-hover);
    }
    
    .login-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .message {
      padding: 0.75rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }
    
    .error {
      background: var(--error-bg);
      color: var(--error-text);
      border: 1px solid var(--error-border);
    }
    
    .success {
      background: var(--success-bg);
      color: var(--success-text);
      border: 1px solid var(--success-border);
    }
    
    .hidden {
      display: none;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <div class="logo-container">
      <img src="/dakota_light.png" alt="Dakota" class="logo">
    </div>
    <div class="subtitle">API Documentation</div>
    
    <form id="loginForm">
      <div class="form-group">
        <label for="username">Username</label>
        <input type="text" id="username" name="username" placeholder="Enter your username" required>
      </div>
      
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" placeholder="Enter your password" required>
      </div>
      
      <button type="submit" id="loginButton" class="login-btn">Login</button>
      
      <div id="errorMessage" class="message error hidden"></div>
      <div id="successMessage" class="message success hidden"></div>
    </form>
  </div>
  
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      const form = document.getElementById('loginForm');
      const errorDiv = document.getElementById('errorMessage');
      const successDiv = document.getElementById('successMessage');
      const loginButton = document.getElementById('loginButton');
      const usernameInput = document.getElementById('username');
      const passwordInput = document.getElementById('password');
      
      // Check if already authenticated
      const existingToken = localStorage.getItem('access_token');
      if (existingToken) {
        const tokenTimestamp = localStorage.getItem('token_timestamp');
        if (tokenTimestamp) {
          const tokenAge = Date.now() - parseInt(tokenTimestamp);
          const maxAge = 60 * 60 * 1000; // 1 hour
          
          if (tokenAge <= maxAge) {
            showSuccess('Already authenticated. Redirecting...');
              window.location.href = '/';
            return;
          } else {
            localStorage.removeItem('access_token');
            localStorage.removeItem('token_timestamp');
          }
        }
      }
      
      form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        
        if (!username || !password) {
          showError('Please enter both username and password.');
          return;
        }
        
        setLoadingState(true);
        hideMessages();
        
        try {
          const response = await fetch('https://marketplace-as-a-service.herokuapp.com/api/oauth2', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: username,
              password: password,
              grant_type: "password"
            })
          });
          
          const data = await response.json();
                
      if (!response.ok) {
            throw new Error(data.message || data.error || 'Login failed: ' + data);
          }
          
          if (!data.access_token) {
            throw new Error('No access token received from server');
          }
          
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('token_timestamp', Date.now().toString());
          
          showSuccess('Login successful! Redirecting...');
          window.location.href = '/';
          
        } catch (error) {
          console.error('Login error:', error);
          showError(error.message || 'Invalid login credentials. Please try again.');
        } finally {
          setLoadingState(false);
        }
      });
      
      function setLoadingState(loading) {
        loginButton.disabled = loading;
        usernameInput.disabled = loading;
        passwordInput.disabled = loading;
        
        if (loading) {
          loginButton.textContent = 'Logging in...';
        } else {
          loginButton.textContent = 'Login';
        }
      }
      
      function showError(message) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
        successDiv.classList.add('hidden');
      }
      
      function showSuccess(message) {
        successDiv.textContent = message;
        successDiv.classList.remove('hidden');
        errorDiv.classList.add('hidden');
      }
      
      function hideMessages() {
        errorDiv.classList.add('hidden');
        successDiv.classList.add('hidden');
      }
    });
  </script>
</body>
</html>`;
  }
  
  // External login generator no longer needed; using inline generateLoginHTML

  
  // Check if we're on login page
  function checkIfLoginPage() {
    return window.location.pathname.includes('/login') || 
           window.location.href.includes('/login') ||
           document.title.includes('Login');
  }
  
  // Fetch user groups from API
  async function fetchUserGroups() {
    const token = localStorage.getItem(AUTH_CONFIG.tokenKey);
    if (!token) {
      ACCESSIBLE_OBJECTS = null;
      return [];
    }

    try {
      const response = await fetch('https://marketplace-as-a-service.herokuapp.com/api/accessibilityObjects', {
        method: 'POST',
        headers: {
          'Oauth-Token': token
        },
        redirect: 'follow'
      });

      if (!response.ok) {
        // Handle unauthorized/invalid token
        if (response.status === 401 || response.status === 403) {
          ACCESSIBLE_OBJECTS = null;
          localStorage.clear();
          window.location.href = AUTH_CONFIG.loginPath;
          return [];
        }
        // Try to read error body for logging
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (_) {}
        console.error('Permissions fetch failed:', response.status, errorText);
        ACCESSIBLE_OBJECTS = null;
        return [];
      }

      // Try to parse JSON; API might return text on success
      let data;
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
        // If API returns plain text, try to derive array or fail gracefully
        console.warn('Non-JSON group response, received text:', text);
        data = {};
      }

      const accessibleObjects = Array.isArray(data?.accessible_objects)
        ? data.accessible_objects
        : Array.isArray(data)
          ? data
          : [];

      ACCESSIBLE_OBJECTS = accessibleObjects; // in-memory only
      return accessibleObjects;
    } catch (error) {
      console.error('Error fetching permissions:', error);
      // On network or unexpected errors, clear and redirect per requirement
      ACCESSIBLE_OBJECTS = null;
      localStorage.clear();
      window.location.href = AUTH_CONFIG.loginPath;
      return [];
    }
  }
  
  // Get user groups
  async function getUserGroups() {
    if (Array.isArray(ACCESSIBLE_OBJECTS)) {
      return ACCESSIBLE_OBJECTS;
    }
    return await fetchUserGroups();
  }
  
  // Check if user has access to endpoint
  async function hasAccess(endpoint) {
    const requiredPermissions = AUTH_CONFIG.endpointGroups[endpoint];
    if (!requiredPermissions || requiredPermissions === null) {
      return true; // No restrictions
    }
    
    const userPermissions = await getUserGroups();
    if (!userPermissions || userPermissions.length === 0) return false;
    
    return userPermissions.includes(requiredPermissions);
  }
  
  // Hide restricted API cards
  async function hideRestrictedCards() {
    const cards = document.querySelectorAll('[href*="/api-reference/endpoint/"]');
    for (const card of cards) {
      const href = card.getAttribute('href');
      if (href && !(await hasAccess(href))) {
        // Handle different card structures
        if (card.parentElement && card.parentElement.id === href) {
          // Card with specific parent structure
          card.parentElement.parentElement.parentElement.style.display = 'none';
        } else {
          // Direct card removal
          card.remove();
        }
      }
    }
    
    // Hide field page cards
    const fieldCards = document.querySelectorAll('[href*="/fields/"]');
    for (const card of fieldCards) {
      const href = card.getAttribute('href');
      if (href && !(await hasAccess(href))) {
          card.remove();
      }
    }
    
    // Hide navigation sidebar items (works for all screen sizes)
    const navLinks = document.querySelectorAll('a[href*="/api-reference/endpoint/"], a[href*="/fields/"]');
    for (const link of navLinks) {
      const href = link.getAttribute('href');
      if (href && !(await hasAccess(href))) {
        // Find the parent navigation item container
        let parent = link.closest('li') || 
                    link.closest('[role="menuitem"]') || 
                    link.closest('.nav-item') ||
                    link.closest('[data-testid]') ||
                    link.parentElement;
        
        if (parent) {
          // Check if this is part of a navigation group
          const groupContainer = parent.closest('[role="group"]') || 
                               parent.closest('.nav-group') ||
                               parent.closest('[data-group]');
          
          if (groupContainer) {
            // Check if this is the only visible item in the group
            const groupItems = groupContainer.querySelectorAll('a[href*="/api-reference/endpoint/"]:not([style*="display: none"]), a[href*="/fields/"]:not([style*="display: none"])');
            if (groupItems.length === 1) {
              // Hide the entire group if it has only one item
              groupContainer.style.display = 'none';
            } else {
              // Just hide this specific item
              parent.style.display = 'none';
            }
          } else {
            // Hide the parent element
            parent.style.display = 'none';
          }
        }
      }
    }

    // Clean up empty navigation groups
    const navGroups = document.querySelectorAll('[role="group"], .nav-group, [data-group]');
    for (const group of navGroups) {
      const visibleItems = group.querySelectorAll('a[href*="/api-reference/endpoint/"]:not([style*="display: none"]), a[href*="/fields/"]:not([style*="display: none"])');
      if (visibleItems.length === 0) {
        group.style.display = 'none';
      }
    }
    
    // Hide the loader after all cards are processed
    hideGlobalLoader();
  }
  
  // Block access to restricted endpoint
  async function blockRestrictedAccess() {
    showGlobalLoader();
    const currentPath = window.location.pathname;
    const requiredGroups = AUTH_CONFIG.endpointGroups[currentPath];
    
    if (requiredGroups && requiredGroups !== null) {
      const userGroups = await getUserGroups();
      const hasRequiredGroup = userGroups && userGroups.some(group => group === requiredGroups);
      if (!hasRequiredGroup) {
        document.body.style.visibility = 'visible';
        document.body.innerHTML = `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #f2f2f2 0%, #edf8fd 100%);
            color: #1F2937;
            font-family: system-ui, -apple-system, sans-serif;
          ">
            <div style="font-size: 4rem; margin-bottom: 1rem;">🔒</div>
            <h1 style="font-size: 2rem; margin-bottom: 1rem;">Access Denied</h1>
            <p style="font-size: 1.1rem; margin-bottom: 2rem; opacity: 0.9;">
              You don't have permission to access this page.
            </p>
            <button onclick="window.location.href='/'" style="
              margin-top: 2rem;
              background: #0A9CE8;
              color: #1F2937;
              border: 2px solid rgba(255,255,255,0.3);
              padding: 0.75rem 2rem;
              border-radius: 25px;
              cursor: pointer;
            ">
              ← Back to Documentation
            </button>
          </div>
        `;
      }
    }
    hideGlobalLoader(); // Hide loader before showing access denied
  }
  
  // Shared logout button builder
  function createLogoutButtonElement(id) {
    const btn = document.createElement('button');
    if (id) btn.id = id;
    btn.type = 'button';
    btn.innerHTML = 'Logout';
    btn.style.backgroundColor = '#dc2626';
    btn.style.color = '#ffffff';
    btn.style.border = 'none';
    btn.style.padding = '8px 12px';
    btn.style.borderRadius = '9999px';
    btn.style.fontSize = '0.875rem';
    btn.style.fontWeight = '500';
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', function(e) { e.preventDefault(); logout(); });
    return btn;
  }
  
  // Add logout button
  function addLogoutButton() {
    const addButton = () => {
      const navbar = document.querySelector('nav') || 
                    document.querySelector('header') || 
                    document.querySelector('[role="navigation"]') ||
                    document.querySelector('.navbar') ||
                    document.querySelector('.nav');
      
      if (!navbar) {
        setTimeout(addButton, 100);
        return;
      }
      
      if (document.getElementById('logout-btn')) return;
      
      const logoutBtn = createLogoutButtonElement('logout-btn');
      logoutBtn.style.marginLeft = '1rem';
      
      navbar.appendChild(logoutBtn);
      navbar.style.setProperty('display', 'flex', 'important');
    };
    
    addButton();
  }
  
  // Logout function
  function logout() {
    ACCESSIBLE_OBJECTS = null;
    localStorage.removeItem(AUTH_CONFIG.tokenKey);
    localStorage.removeItem(AUTH_CONFIG.timestampKey);
    localStorage.removeItem(AUTH_CONFIG.groupsKey);
    document.body.classList.remove('authenticated');
    window.location.href = AUTH_CONFIG.loginPath;
  }
  
  // Load login page
  async function createCleanLoginPage() {
    try {
      const loginHTML = generateLoginHTML();
      
      document.open();
      document.write(loginHTML);
      document.close();
    } catch (error) {
      console.error('Error generating login page:', error);
      window.location.href = AUTH_CONFIG.loginPath;
    }
  }
  
  // Main authentication check
  async function checkAuthentication() {
    const currentPath = window.location.pathname;

    if (checkIfLoginPage()) {
      await createCleanLoginPage();
      return;
    }
    
    // Conditionally show loader based on route whitelist
    if (shouldShowLoaderForPath(currentPath)) {
      showGlobalLoader();
    }
    
    const token = localStorage.getItem(AUTH_CONFIG.tokenKey);
    if (!token) {
      hideGlobalLoader();
      window.location.href = AUTH_CONFIG.loginPath;
      return;
    }
    
    const tokenTimestamp = localStorage.getItem(AUTH_CONFIG.timestampKey);
    if (tokenTimestamp) {
      const tokenAge = Date.now() - parseInt(tokenTimestamp);
      if (tokenAge > AUTH_CONFIG.maxAge) {
        localStorage.removeItem(AUTH_CONFIG.tokenKey);
        localStorage.removeItem(AUTH_CONFIG.timestampKey);
        localStorage.removeItem(AUTH_CONFIG.groupsKey);
        ACCESSIBLE_OBJECTS = null;
        hideGlobalLoader();
        window.location.href = AUTH_CONFIG.loginPath;
        return;
      }
    }
    
    document.body.classList.add('authenticated');
    addLogoutButton();
    
    // Check endpoint access for both API endpoints and field pages
    if (currentPath.includes('/api-reference/endpoint/') || currentPath.includes('/fields/')) {
      await blockRestrictedAccess();
    }
    
    // Hide restricted cards on all pages (navigation sidebar is always visible)
    // The loader will be hidden inside hideRestrictedCards function
    setTimeout(hideRestrictedCards, 100);
    
  }
  
  // Run authentication check
  checkAuthentication();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuthentication);
  } else {
    checkAuthentication();
  }
  
    // Listen for navigation changes
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function() {
      originalPushState.apply(history, arguments);
      setTimeout(() => {
        const nextPath = getPathnameFromArg(arguments[2]);
        if (shouldShowLoaderForPath(nextPath)) {
          showGlobalLoader();
        }
        setTimeout(checkAuthentication, 50);
      }, 0);
    };
    
    history.replaceState = function() {
      originalReplaceState.apply(history, arguments);
      setTimeout(() => {
        const nextPath = getPathnameFromArg(arguments[2]);
        if (shouldShowLoaderForPath(nextPath)) {
          showGlobalLoader();
        }
        setTimeout(checkAuthentication, 50);
      }, 0);
    };

  // Listen for storage changes
  window.addEventListener('storage', function(e) {
    if (e.key === AUTH_CONFIG.tokenKey && !e.newValue) {
      ACCESSIBLE_OBJECTS = null;
      document.body.classList.remove('authenticated');
      hideGlobalLoader();
      window.location.href = AUTH_CONFIG.loginPath;
    }
  });
  
  // Listen for window resize events to handle responsive navigation
  window.addEventListener('resize', function() {
    setTimeout(() => {
      if (shouldShowLoaderForPath(window.location.pathname)) {
        showGlobalLoader();
      }
      setTimeout(() => {
        hideRestrictedCards();
      }, 100);
    }, 0);
  });

  // Set up mutation observer to handle navigation reopening
  const observer = new MutationObserver(function(mutations) {
    let shouldRehide = false;
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (let node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE &&
              ((node.id === 'headlessui-portal-root') || (node.matches && node.matches('#headlessui-portal-root')))) {

            const dialogEl = node.querySelector('[role="dialog"][id^="headlessui-dialog-_r"]');
            if (dialogEl) {
              shouldRehide = true;
              break;
            }
          }
        }
      }
    });
    if (shouldRehide) {
      showGlobalLoader();
      setTimeout(hideRestrictedCards, 100);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Bind 'More actions' button to logout (reuse shared creator)
  function bindMoreActionsLogout(root) {
    try {
      const scope = (root && root.querySelector) ? root : document;
      const buttons = scope.querySelectorAll('button[aria-label="More actions"]');

      buttons.forEach(function(btn) {
        if (!btn) return;

        // Replace button content/style with a standardized logout button
        const parent = btn.parentNode;
        const newBtn = createLogoutButtonElement('logout-btn-inline');
        newBtn.style.minWidth = 'fit-content';
        newBtn.style.padding = '6px 10px';
        if (parent) {
          parent.replaceChild(newBtn, btn);
        }
      });
    } catch (err) {
      console.error('Error binding More actions logout:', err);
    }
  }
  
  // Initial bind on load
  bindMoreActionsLogout(document);
  
  // Observe for dynamic insertion of the More actions button
  const moreActionsObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (let node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE && (
                (node.matches && node.matches('button[aria-label="More actions"]')) ||
                (node.querySelector && node.querySelector('button[aria-label="More actions"]'))
              )) {
            setTimeout(function() { bindMoreActionsLogout(node); }, 0);
            break;
          }
        }
      }
    });
  });
  moreActionsObserver.observe(document.body, { childList: true, subtree: true });
})();

console.log('Page loaded ✅');

const form = document.getElementById('form');
const input = document.getElementById('domain');
const result = document.getElementById('result');

function show(html) {
  result.innerHTML = html;
}

// Rate limiting function
const RATE_LIMIT = {
  maxRequests: 5,
  timeWindow: 60000, // 1 minute
  requests: []
};

function checkRateLimit() {
  const now = Date.now();
  // Remove old requests
  RATE_LIMIT.requests = RATE_LIMIT.requests.filter(time => now - time < RATE_LIMIT.timeWindow);
  
  if (RATE_LIMIT.requests.length >= RATE_LIMIT.maxRequests) {
    const oldestRequest = RATE_LIMIT.requests[0];
    const waitTime = Math.ceil((RATE_LIMIT.timeWindow - (now - oldestRequest)) / 1000);
    throw new Error(`Too many requests. Please wait ${waitTime} seconds.`);
  }
  
  RATE_LIMIT.requests.push(now);
}

// Domain history management
const DOMAIN_HISTORY = {
  key: 'domainHistory',
  maxItems: 10,
  
  get() {
    try {
      return JSON.parse(localStorage.getItem(this.key) || '[]');
    } catch {
      return [];
    }
  },
  
  add(domain, result) {
    const history = this.get();
    const newEntry = {
      domain,
      result,
      timestamp: Date.now()
    };
    
    // Remove old entry for same domain if exists
    const filtered = history.filter(item => item.domain !== domain);
    // Add new entry at the beginning
    filtered.unshift(newEntry);
    // Keep only maxItems
    const trimmed = filtered.slice(0, this.maxItems);
    
    localStorage.setItem(this.key, JSON.stringify(trimmed));
    this.updateHistoryUI();
  },
  
  updateHistoryUI() {
    const history = this.get();
    const historyContainer = document.getElementById('searchHistory');
    if (!historyContainer) return;
    
    const items = history.map(item => `
      <div class="history-item" onclick="checkHistoryDomain('${item.domain}')">
        <div class="history-domain">${item.domain}</div>
        <div class="history-score">Score: ${item.result?.metrics?.page_rank_decimal || 'N/A'}</div>
        <div class="history-time">${new Date(item.timestamp).toLocaleString()}</div>
      </div>
    `).join('');
    
    historyContainer.innerHTML = items || '<p class="no-history">No recent searches</p>';
  }
};

// Domain validation function
function validateDomain(domain) {
  if (!domain) return { valid: false, message: 'Please enter a domain' };
  
  // Remove http://, https://, www. and any paths
  const cleanDomain = domain.replace(/^https?:\/\//i, '')
                           .replace(/^www\./i, '')
                           .split('/')[0];
  
  // Check for valid domain format using regex
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
  if (!domainRegex.test(cleanDomain)) {
    return { 
      valid: false, 
      message: 'Please enter a valid domain (e.g., example.com)' 
    };
  }
  
  return { valid: true, domain: cleanDomain };
}

// Function to copy results
function copyResults() {
  const resultText = document.getElementById('result').innerText;
  navigator.clipboard.writeText(resultText).then(() => {
    const copyBtn = document.getElementById('copyBtn');
    copyBtn.textContent = 'Copied! ✓';
    setTimeout(() => copyBtn.textContent = 'Copy Results', 2000);
  });
}

// Function to share results
function shareResults() {
  const domain = document.querySelector('.result-domain').textContent;
  const score = document.querySelector('.metric-value').textContent;
  const shareText = `Check out the Domain Authority score for ${domain}: ${score} via DA/PA Checker`;
  
  if (navigator.share) {
    navigator.share({
      title: 'Domain Authority Score',
      text: shareText,
      url: window.location.href
    }).catch(console.error);
  } else {
    navigator.clipboard.writeText(shareText).then(() => {
      const shareBtn = document.getElementById('shareBtn');
      shareBtn.textContent = 'Link Copied! ✓';
      setTimeout(() => shareBtn.textContent = 'Share Results', 2000);
    });
  }
}

// Function to check domain from history
function checkHistoryDomain(domain) {
  input.value = domain;
  form.dispatchEvent(new Event('submit'));
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const domainInput = input.value.trim();
  const validation = validateDomain(domainInput);
  
  if (!validation.valid) {
    return show(`
      <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
        <h4 style="color: #856404; margin-bottom: 8px;">⚠️ Validation Error</h4>
        <p style="color: #666; margin: 0;">${validation.message}</p>
      </div>
    `);
  }
  
  try {
    // Check rate limit
    checkRateLimit();
  } catch (err) {
    return show(`
      <div style="background: #ffe5e5; padding: 15px; border-radius: 8px; border-left: 4px solid #ff6b6b;">
        <h4 style="color: #ff6b6b; margin-bottom: 8px;">⚠️ Rate Limit</h4>
        <p style="color: #666; margin: 0;">${err.message}</p>
      </div>
    `);
  }
  
  const domain = validation.domain;

  // Disable input and button during loading
  input.disabled = true;
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  show(`
    <div style="text-align: center;">
      <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #667eea; border-radius: 50%; border-top-color: transparent; animation: spin 1s linear infinite;"></div>
      <p style="margin-top: 10px; color: #667eea;">Checking domain... ⏳</p>
    </div>
  `);

  // Add spin animation style if not already present
  if (!document.querySelector('#spin-animation')) {
    const style = document.createElement('style');
    style.id = 'spin-animation';
    style.textContent = '@keyframes spin { to { transform: rotate(360deg) } }';
    document.head.appendChild(style);
  }

  try {
    const res = await fetch(`/api/oprank?domain=${encodeURIComponent(domain)}`);
    const data = await res.json();

    if (!res.ok || !data.ok) throw new Error(data.message || 'Request failed');

    const resultHtml = `
      <div class="result-container">
        <h3>Result (Open PageRank)</h3>
        <div class="metrics-grid">
          <div class="metric-card">
            <h4>Domain Authority Metrics</h4>
            <p><b>Domain:</b> <span class="result-domain">${data.domain}</span></p>
            <p><b>DA Score:</b> <span class="metric-value">${data.metrics.page_rank_decimal ?? 'n/a'}</span></p>
            <p><b>Integer Rank:</b> ${data.metrics.page_rank_integer ?? 'n/a'}</p>
            <p><b>Global Rank:</b> ${data.metrics.rank ? formatNumber(data.metrics.rank) : 'n/a'}</p>
            <p><b>Status:</b> ${data.metrics.status_code === 200 ? '✅ Active' : '⚠️ Issue'}</p>
          </div>
        </div>

        <div class="chart-container" style="margin-top: 20px;">
          <canvas id="metricsChart"></canvas>
        </div>
        
        <div class="action-buttons" style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
          <button onclick="copyResults()" id="copyBtn" class="action-btn">
            Copy Results
          </button>
          <button onclick="shareResults()" id="shareBtn" class="action-btn">
            Share Results
          </button>
          <button onclick="captureScreenshot()" id="screenshotBtn" class="action-btn">
            Save Screenshot
          </button>
          <button onclick="exportToPDF()" id="pdfBtn" class="action-btn">
            Export to PDF
          </button>
          <button onclick="exportToCSV()" id="csvBtn" class="action-btn">
            Export to CSV
          </button>
          <button onclick="checkMultipleDomains()" id="bulkBtn" class="action-btn">
            Bulk Check
          </button>
        </div>
        
        <p style="color:#9bb0d3; margin-top: 15px;">
          <small>Note: yeh DA/PA nahi, Open PageRank score hai (free).</small>
        </p>
      </div>
      
      <div class="history-section" style="margin-top: 30px;">
        <h4>Recent Searches</h4>
        <div id="searchHistory" class="search-history">
          <!-- History items will be inserted here -->
        </div>
      </div>
    `;
    
    show(resultHtml);
    
    // Add to history
    DOMAIN_HISTORY.add(data.domain, data);
    
    // Add styles if not already present
    if (!document.getElementById('dynamicStyles')) {
      const styles = document.createElement('style');
      styles.id = 'dynamicStyles';
      styles.textContent = `
        .action-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          background: #667eea;
          color: white;
          cursor: pointer;
          transition: all 0.3s;
        }
        .action-btn:hover {
          background: #764ba2;
        }
        .history-item {
          padding: 10px;
          border: 1px solid #eee;
          border-radius: 4px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.3s;
        }
        .history-item:hover {
          background: #f8f9fa;
          border-color: #667eea;
        }
        .history-domain {
          font-weight: bold;
          color: #667eea;
        }
        .history-score {
          color: #666;
          font-size: 0.9em;
        }
        .history-time {
          color: #999;
          font-size: 0.8em;
        }
        .no-history {
          color: #666;
          text-align: center;
          padding: 20px;
        }
      `;
      document.head.appendChild(styles);
    }
  } catch (err) {
    let errorMessage = err.message;
    
    // User friendly error messages
    if (errorMessage.includes('404')) {
      errorMessage = 'Domain not found in OpenPageRank database';
    } else if (errorMessage.includes('timeout')) {
      errorMessage = 'Server is taking too long to respond. Please try again.';
    } else if (errorMessage.includes('Network')) {
      errorMessage = 'Unable to connect to server. Please check your internet connection.';
    }
    
    show(`
      <div style="background: #ffe5e5; padding: 15px; border-radius: 8px; border-left: 4px solid #ff6b6b;">
        <h4 style="color: #ff6b6b; margin-bottom: 8px;">⚠️ Error</h4>
        <p style="color: #666; margin: 0;">${errorMessage}</p>
      </div>
    `);
  } finally {
    // Re-enable input and button
    input.disabled = false;
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = false;
  }
});
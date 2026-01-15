// CEO SIMPLE DASHBOARD - MAIN CONTROLLER
console.log('👑 Starting CEO Dashboard Controller...');

class CEODashboard {
    constructor() {
        this.currentCEO = null;
        this.businessData = null;
        this.autoReportTimer = null;
        this.autoSyncTimer = null;
        this.updateInterval = null;
        this.scrollInterval = null;
        this.currentScrollPosition = 0;
        this.scrollSpeed = 1; // pixels per interval
        this.init();
    }
    
    async init() {
        try {
            console.log('🚀 Dashboard controller initializing...');
            
            // Setup DOM event listeners
            this.setupEventListeners();
            
            // Check for auto-login
            setTimeout(() => this.checkAutoLogin(), 1000);
            
            // Update time every minute
            setInterval(() => this.updateWelcomeMessage(), 60000);
            
            // Start periodic updates
            this.startPeriodicUpdates();
            
            console.log('✅ Dashboard controller ready');
            
        } catch (error) {
            console.error('❌ Dashboard init error:', error);
            this.showMessage('Dashboard initialization failed', 'error');
        }
    }
    
    setupEventListeners() {
        // Setup button handlers
        const createBtn = document.querySelector('#createAccountScreen .btn-primary');
        if (createBtn) {
            createBtn.onclick = () => this.createCEOAccount();
        }
        
        const loginBtn = document.querySelector('#loginScreen .btn-primary');
        if (loginBtn) {
            loginBtn.onclick = () => this.loginCEO();
        }
        
        const logoutBtn = document.querySelector('.btn-logout');
        if (logoutBtn) {
            logoutBtn.onclick = () => this.logoutCEO();
        }
        
        const refreshBtn = document.querySelector('.btn-secondary');
        if (refreshBtn) {
            refreshBtn.onclick = () => this.forceRefreshData();
        }
        
        const pdfBtn = document.querySelector('.btn-pdf');
        if (pdfBtn) {
            pdfBtn.onclick = () => this.generatePDFReport();
        }
        
        // Add manual refresh button event
        const manualRefreshBtn = document.getElementById('manualRefreshBtn');
        if (!manualRefreshBtn) {
            // Add refresh button to header
            setTimeout(() => {
                this.addRefreshButton();
            }, 1000);
        }
        
        // Navigation links
        const goToLogin = document.querySelector('#goToLogin');
        if (goToLogin) {
            goToLogin.onclick = (e) => {
                e.preventDefault();
                this.showLoginScreen();
            };
        }
        
        const goToCreate = document.querySelector('#goToCreate');
        if (goToCreate) {
            goToCreate.onclick = (e) => {
                e.preventDefault();
                this.showLoginScreen();
            };
        }
        
        // Setup auto-report (start after dashboard loads)
        this.setupAutoReport();
        this.setupAutoSync();
        
        // Start auto-scroll when dashboard is shown
        this.startAutoScroll();
    }
    
    addRefreshButton() {
        const headerRight = document.querySelector('.header-right');
        if (headerRight && !document.getElementById('manualRefreshBtn')) {
            const refreshBtn = document.createElement('button');
            refreshBtn.id = 'manualRefreshBtn';
            refreshBtn.className = 'btn-refresh';
            refreshBtn.innerHTML = '🔄 REFRESH NOW';
            refreshBtn.onclick = () => this.forceRefreshData();
            headerRight.insertBefore(refreshBtn, headerRight.firstChild);
        }
    }
    
    startAutoScroll() {
        // Clear existing scroll interval
        if (this.scrollInterval) clearInterval(this.scrollInterval);
        
        this.scrollInterval = setInterval(() => {
            this.scrollTopProducts();
        }, 50); // Scroll every 50ms for smooth movement
    }
    
    scrollTopProducts() {
        const tableBody = document.getElementById('topProductsTableBody');
        const tableContainer = document.querySelector('#topProductsTable').closest('.table-container');
        
        if (tableBody && tableContainer && tableBody.scrollHeight > tableContainer.clientHeight) {
            // If we've scrolled to the bottom, reset to top
            if (this.currentScrollPosition >= (tableBody.scrollHeight - tableContainer.clientHeight)) {
                this.currentScrollPosition = 0;
                tableContainer.scrollTop = 0;
            } else {
                this.currentScrollPosition += this.scrollSpeed;
                tableContainer.scrollTop = this.currentScrollPosition;
            }
        }
    }
    
    startPeriodicUpdates() {
        // Clear existing interval
        if (this.updateInterval) clearInterval(this.updateInterval);
        
        // Update every 30 seconds when on dashboard
        this.updateInterval = setInterval(() => {
            if (this.currentCEO && document.getElementById('dashboardScreen').style.display !== 'none') {
                this.loadBusinessData(true); // Silent update
            }
        }, 30000); // 30 seconds
    }
    
    setupAutoReport() {
        // Clear existing timer
        if (this.autoReportTimer) clearInterval(this.autoReportTimer);
        
        this.autoReportTimer = setInterval(() => {
            const now = new Date();
            const time = now.toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            if (time === CEO_CONFIG.REPORT_TIME && this.currentCEO) {
                console.log('📄 Generating automatic daily report...');
                this.generatePDFReport();
            }
        }, CEO_CONFIG.AUTO_REPORT_CHECK);
    }
    
    setupAutoSync() {
        // Clear existing timer
        if (this.autoSyncTimer) clearInterval(this.autoSyncTimer);
        
        this.autoSyncTimer = setInterval(() => {
            if (this.currentCEO && this.businessData) {
                this.loadBusinessData(true); // Silent sync
            }
        }, CEO_CONFIG.SYNC_INTERVAL);
    }
    
    // MESSAGE HANDLER
    showMessage(text, type = 'info') {
        try {
            // Remove existing messages
            const existing = document.querySelectorAll('.ceo-message');
            existing.forEach(msg => msg.remove());
            
            const msg = document.createElement('div');
            msg.className = 'ceo-message';
            msg.innerHTML = `
                <div style="position: fixed; top: 20px; right: 20px; background: white; padding: 15px 25px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-left: 5px solid ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'}; z-index: 1000; display: flex; align-items: center; gap: 15px; max-width: 400px;">
                    <span style="font-size: 1.5rem;">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
                    <div style="flex: 1;">${text}</div>
                    <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; cursor: pointer; font-size: 1.2rem; color: #666;">×</button>
                </div>
            `;
            document.body.appendChild(msg);
            
            // Auto-remove after display time
            setTimeout(() => {
                if (msg.parentElement) {
                    msg.remove();
                }
            }, CEO_CONFIG.MESSAGE_DISPLAY_TIME);
            
        } catch (error) {
            console.error('❌ Show message error:', error);
        }
    }
    
    // FORCE REFRESH DATA
    async forceRefreshData() {
        try {
            const refreshBtn = document.getElementById('manualRefreshBtn');
            if (refreshBtn) {
                refreshBtn.innerHTML = '⏳ REFRESHING...';
                refreshBtn.disabled = true;
            }
            
            this.showMessage('Forcing data refresh from main system...', 'info');
            
            // Force database refresh
            const refreshed = await window.ceoDB.forceRefresh();
            
            if (refreshed) {
                this.showMessage('Data refreshed successfully!', 'success');
                await this.loadBusinessData();
            } else {
                this.showMessage('Refresh failed. Using cached data.', 'warning');
                await this.loadBusinessData();
            }
            
        } catch (error) {
            console.error('❌ Force refresh error:', error);
            this.showMessage('Refresh failed. Please try again.', 'error');
        } finally {
            setTimeout(() => {
                const refreshBtn = document.getElementById('manualRefreshBtn');
                if (refreshBtn) {
                    refreshBtn.innerHTML = '🔄 REFRESH NOW';
                    refreshBtn.disabled = false;
                }
            }, 2000);
        }
    }
    
    // CREATE CEO ACCOUNT
    async createCEOAccount() {
        try {
            console.log('👑 Creating CEO account...');
            
            // Get form data
            const name = document.getElementById('ceoName')?.value.trim();
            const email = document.getElementById('ceoEmail')?.value.trim();
            const phone = document.getElementById('ceoPhone')?.value.trim();
            const password = document.getElementById('ceoPassword')?.value;
            const confirm = document.getElementById('ceoConfirmPassword')?.value;
            const agreed = document.getElementById('agreeTerms')?.checked;
            
            // Validation
            if (!name || !email || !password || !confirm) {
                this.showMessage('Please fill in all required fields', 'error');
                return;
            }
            
            if (password.length < CEO_CONFIG.PASSWORD_MIN) {
                this.showMessage(`Password must be at least ${CEO_CONFIG.PASSWORD_MIN} characters`, 'error');
                return;
            }
            
            if (password !== confirm) {
                this.showMessage('Passwords do not match', 'error');
                return;
            }
            
            if (!agreed) {
                this.showMessage('Please agree to the terms', 'error');
                return;
            }
            
            // Show loading
            const btn = document.querySelector('#createAccountScreen .btn-primary');
            const original = btn?.innerHTML || '';
            if (btn) {
                btn.innerHTML = '⏳ CREATING ACCOUNT...';
                btn.disabled = true;
            }
            
            this.showMessage('Creating your CEO account...');
            
            // Create account through database
            const result = await window.ceoDB.createCEOAccount({
                name, email, phone, password
            });
            
            if (!result.success) {
                if (result.code === 'EXISTS') {
                    this.showMessage('Account exists. Please login.', 'info');
                    this.showLoginScreen();
                    const loginEmail = document.getElementById('loginEmail');
                    if (loginEmail) loginEmail.value = email;
                    return;
                }
                this.showMessage(result.message, 'error');
                return;
            }
            
            this.showMessage('Account created! Logging you in...', 'success');
            
            // Auto login after 1 second
            setTimeout(async () => {
                const login = await window.ceoDB.loginCEO(email, password);
                
                if (login.success) {
                    this.currentCEO = login.user;
                    localStorage.setItem('ceo_user', JSON.stringify(this.currentCEO));
                    localStorage.setItem('ceo_email', email);
                    
                    this.showDashboard();
                    await this.loadBusinessData();
                    
                    this.showMessage(`Welcome, ${this.currentCEO.name}!`, 'success');
                } else {
                    this.showMessage(login.message, 'error');
                }
            }, 1000);
            
        } catch (error) {
            console.error('❌ Create account error:', error);
            this.showMessage('Failed to create account', 'error');
        } finally {
            setTimeout(() => {
                const btn = document.querySelector('#createAccountScreen .btn-primary');
                if (btn) {
                    btn.innerHTML = '✅ CREATE ACCOUNT & ACCESS DASHBOARD';
                    btn.disabled = false;
                }
            }, 2000);
        }
    }
    
    // LOGIN CEO
    async loginCEO() {
        try {
            const email = document.getElementById('loginEmail')?.value.trim();
            const password = document.getElementById('loginPassword')?.value;
            
            if (!email || !password) {
                this.showMessage('Enter email and password', 'error');
                return;
            }
            
            const btn = document.querySelector('#loginScreen .btn-primary');
            const original = btn?.innerHTML || '';
            if (btn) {
                btn.innerHTML = '⏳ LOGGING IN...';
                btn.disabled = true;
            }
            
            this.showMessage('Logging in...');
            
            const result = await window.ceoDB.loginCEO(email, password);
            
            if (!result.success) {
                this.showMessage(result.message, 'error');
                return;
            }
            
            this.currentCEO = result.user;
            localStorage.setItem('ceo_user', JSON.stringify(this.currentCEO));
            localStorage.setItem('ceo_email', email);
            
            this.showDashboard();
            await this.loadBusinessData();
            
            this.showMessage(`Welcome back, ${this.currentCEO.name}!`, 'success');
            
        } catch (error) {
            console.error('❌ Login error:', error);
            this.showMessage('Login failed', 'error');
        } finally {
            const btn = document.querySelector('#loginScreen .btn-primary');
            if (btn) {
                btn.innerHTML = '🔑 ACCESS DASHBOARD';
                btn.disabled = false;
            }
        }
    }
    
    // SCREEN MANAGEMENT
    showCreateAccountScreen() {
        document.getElementById('createAccountScreen').style.display = 'flex';
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('dashboardScreen').style.display = 'none';
    }
    
    showLoginScreen() {
        document.getElementById('createAccountScreen').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('dashboardScreen').style.display = 'none';
    }
    
    showDashboard() {
        document.getElementById('createAccountScreen').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('dashboardScreen').style.display = 'block';
        
        if (this.currentCEO) {
            document.getElementById('dashboardTitle').textContent = `👑 ${this.currentCEO.name}'s BUSINESS VIEW`;
            this.updateWelcomeMessage();
            this.addRefreshButton();
            // Start auto-scroll when dashboard is shown
            setTimeout(() => this.startAutoScroll(), 1000);
        }
    }
    
    updateWelcomeMessage() {
        const now = new Date();
        const hour = now.getHours();
        let greeting = 'Good ';
        
        if (hour < 12) greeting += 'Morning';
        else if (hour < 18) greeting += 'Afternoon';
        else greeting += 'Evening';
        
        const welcomeEl = document.getElementById('welcomeMessage');
        if (welcomeEl) {
            welcomeEl.textContent = 
                `${greeting}! | Updated: ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        }
        
        // Update connection status
        this.updateConnectionStatus();
    }
    
    updateConnectionStatus() {
        const connectionEl = document.getElementById('connectionStatus');
        if (!connectionEl) return;
        
        if (this.businessData?.isConnected) {
            const lastUpdate = this.businessData.summary?.lastSync;
            let statusText = '✅ Connected to main database';
            
            if (lastUpdate) {
                const updateTime = new Date(lastUpdate);
                const now = new Date();
                const diffMinutes = Math.floor((now - updateTime) / (1000 * 60));
                
                if (diffMinutes < 1) {
                    statusText += ' • Just updated';
                } else if (diffMinutes < 5) {
                    statusText += ` • Updated ${diffMinutes} min ago`;
                } else {
                    statusText += ` • Last update: ${updateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                }
            }
            
            connectionEl.textContent = statusText;
            connectionEl.className = 'connection-good';
        } else {
            const lastUpdate = this.businessData?.summary?.lastSync;
            let statusText = '⚠️ Using cached data';
            
            if (lastUpdate) {
                const updateTime = new Date(lastUpdate);
                const now = new Date();
                const diffMinutes = Math.floor((now - updateTime) / (1000 * 60));
                
                if (diffMinutes < 60) {
                    statusText += ` • Data from ${diffMinutes} min ago`;
                } else {
                    statusText += ` • Last sync: ${updateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
                }
            }
            
            connectionEl.textContent = statusText;
            connectionEl.className = 'connection-warning';
        }
    }
    
    // LOAD BUSINESS DATA WITH VISUAL FEEDBACK
    async loadBusinessData(silent = false) {
        try {
            if (!silent) {
                this.showMessage('Loading latest business data...', 'info');
                this.showLoadingIndicator(true);
            }
            
            console.log(`🔄 Loading business data...`);
            
            this.businessData = await window.ceoDB.getBusinessData();
            
            // Update dashboard with new data
            this.updateDashboard();
            this.updateWelcomeMessage();
            this.updateDataFreshnessIndicator();
            
            if (!silent) {
                const dataAge = this.businessData.connection?.dataAge || 0;
                if (dataAge < 60) {
                    this.showMessage('Data loaded successfully (fresh data)', 'success');
                } else if (dataAge < 300) {
                    this.showMessage(`Data loaded (${Math.floor(dataAge/60)} min old)`, 'info');
                } else {
                    this.showMessage('Using cached data - Connection issues', 'warning');
                }
            }
            
        } catch (error) {
            console.error('❌ Load business data error:', error);
            
            if (!silent) {
                this.showMessage('Failed to load data. Using cached information.', 'error');
            }
            
            // Try to use existing data or get fallback
            if (!this.businessData) {
                this.businessData = window.ceoDB.getFallbackData();
                this.updateDashboard();
            }
            
        } finally {
            if (!silent) {
                this.showLoadingIndicator(false);
            }
        }
    }
    
    showLoadingIndicator(show) {
        const loadingEl = document.getElementById('loadingIndicator');
        if (loadingEl) {
            loadingEl.style.display = show ? 'block' : 'none';
        } else if (show) {
            // Create loading indicator
            const indicator = document.createElement('div');
            indicator.id = 'loadingIndicator';
            indicator.innerHTML = `
                <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.8); z-index: 9999; display: flex; justify-content: center; align-items: center;">
                    <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 5px 20px rgba(0,0,0,0.2); text-align: center;">
                        <div style="font-size: 3rem; margin-bottom: 20px;">⏳</div>
                        <div style="font-size: 1.2rem; color: var(--primary); font-weight: bold;">Loading Latest Data...</div>
                        <div style="margin-top: 10px; color: #666;">Fetching from main system</div>
                        <div class="loading-spinner" style="margin-top: 20px;"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(indicator);
            
            // Add CSS for spinner
            if (!document.querySelector('#loading-spinner-css')) {
                const style = document.createElement('style');
                style.id = 'loading-spinner-css';
                style.textContent = `
                    .loading-spinner {
                        width: 40px;
                        height: 40px;
                        margin: 0 auto;
                        border: 4px solid #f3f3f3;
                        border-top: 4px solid var(--primary);
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `;
                document.head.appendChild(style);
            }
        }
    }
    
    updateDataFreshnessIndicator() {
        const freshnessEl = document.getElementById('dataFreshness');
        if (!freshnessEl) {
            // Add freshness indicator to header
            const headerLeft = document.querySelector('.header-left');
            if (headerLeft) {
                const freshness = document.createElement('div');
                freshness.id = 'dataFreshness';
                freshness.style.marginTop = '5px';
                freshness.style.fontSize = '0.9rem';
                headerLeft.appendChild(freshness);
            }
        }
        
        if (this.businessData?.connection?.dataAge !== undefined) {
            const dataAge = this.businessData.connection.dataAge;
            const freshnessEl = document.getElementById('dataFreshness');
            
            if (freshnessEl) {
                if (dataAge === null) {
                    freshnessEl.textContent = '🔄 Syncing...';
                    freshnessEl.style.color = '#f59e0b';
                } else if (dataAge < 60) {
                    freshnessEl.textContent = '🟢 Live data';
                    freshnessEl.style.color = '#10b981';
                } else if (dataAge < 300) {
                    freshnessEl.textContent = `🟡 ${Math.floor(dataAge/60)} min ago`;
                    freshnessEl.style.color = '#f59e0b';
                } else {
                    freshnessEl.textContent = '🔴 Stale data';
                    freshnessEl.style.color = '#ef4444';
                }
            }
        }
    }
    
    // UPDATE DASHBOARD UI
    updateDashboard() {
        if (!this.businessData) return;
        
        const { summary, sales, products, debts, customers, stock, topProducts, salesAnalysis, connection } = this.businessData;
        
        console.log(`📊 Updating dashboard with ${sales.length} sales, ${products.length} products`);
        
        // Update big numbers
        this.updateBigNumbers(summary, salesAnalysis);
        
        // Update stock alert
        this.updateStockAlert(summary, stock);
        
        // Update sales analysis
        this.updateSalesAnalysis(salesAnalysis);
        
        // Update tables
        this.updateSalesTable(sales);
        this.updateTopProductsTable(topProducts);
        this.updateStockTable(products);
        this.updateDebtsTable(debts);
        this.updateCustomersTable(customers);
        
        // Update totals
        this.updateSectionTotals(summary);
        
        // Update connection status
        this.updateConnectionStatus();
        
        // Update last update time
        this.updateLastUpdateTime();
        
        // Restart auto-scroll after updating table
        setTimeout(() => this.startAutoScroll(), 100);
    }
    
    updateBigNumbers(summary, salesAnalysis) {
        const totalSalesEl = document.getElementById('totalSales');
        const productsSoldEl = document.getElementById('productsSold');
        const staffCountEl = document.getElementById('staffCount');
        const totalDebtEl = document.getElementById('totalDebt');
        const transactionCountEl = document.getElementById('transactionCount');
        const averageSaleEl = document.getElementById('averageSale');
        const customerCountEl = document.getElementById('customerCount');
        const profitMarginEl = document.getElementById('profitMargin');
        
        if (totalSalesEl) {
            totalSalesEl.textContent = `₦${summary.totalSales.toLocaleString()}`;
            totalSalesEl.classList.add('updated');
            setTimeout(() => totalSalesEl.classList.remove('updated'), 1000);
        }
        if (productsSoldEl) {
            productsSoldEl.textContent = summary.productsSold.toLocaleString();
            productsSoldEl.classList.add('updated');
            setTimeout(() => productsSoldEl.classList.remove('updated'), 1000);
        }
        if (staffCountEl) {
            staffCountEl.textContent = summary.staffCount.toLocaleString();
            staffCountEl.classList.add('updated');
            setTimeout(() => staffCountEl.classList.remove('updated'), 1000);
        }
        if (totalDebtEl) {
            totalDebtEl.textContent = `₦${summary.totalDebt.toLocaleString()}`;
            totalDebtEl.classList.add('updated');
            setTimeout(() => totalDebtEl.classList.remove('updated'), 1000);
        }
        if (transactionCountEl) transactionCountEl.textContent = `${summary.transactionCount} transactions`;
        if (averageSaleEl) averageSaleEl.textContent = `Avg: ₦${salesAnalysis?.averageSale?.toFixed(0) || '0'}`;
        if (customerCountEl) customerCountEl.textContent = `${summary.activeCustomers} customers`;
        if (profitMarginEl) profitMarginEl.textContent = `Margin: ${summary.profitMargin}%`;
    }
    
    updateStockAlert(summary, stock) {
        const statusText = document.getElementById('stockStatusText');
        const stockMessage = document.getElementById('stockMessage');
        const criticalCount = document.getElementById('criticalCount');
        const warningCount = document.getElementById('warningCount');
        const goodCount = document.getElementById('goodCount');
        
        if (statusText) {
            statusText.textContent = summary.stockStatus.toUpperCase();
            statusText.className = `status-${summary.stockStatus}`;
        }
        
        if (stockMessage) {
            let stockMsg = '';
            if (stock.criticalCount > 0) {
                stockMsg = `🚨 ${stock.criticalCount} products need immediate restock`;
            } else if (stock.warningCount > 0) {
                stockMsg = `⚠️ ${stock.warningCount} products running low`;
            } else {
                stockMsg = '✅ All stock levels are good';
            }
            stockMessage.textContent = stockMsg;
        }
        
        if (criticalCount) {
            criticalCount.textContent = `${stock.criticalCount || 0} critical`;
            criticalCount.style.display = stock.criticalCount > 0 ? 'inline-block' : 'none';
        }
        if (warningCount) {
            warningCount.textContent = `${stock.warningCount || 0} warning`;
            warningCount.style.display = stock.warningCount > 0 ? 'inline-block' : 'none';
        }
        if (goodCount) {
            goodCount.textContent = `${stock.goodCount || 0} good`;
            goodCount.style.display = stock.goodCount > 0 ? 'inline-block' : 'none';
        }
    }
    
    updateSalesAnalysis(salesAnalysis) {
        const peakHourEl = document.getElementById('peakHour');
        const peakHourAmountEl = document.getElementById('peakHourAmount');
        const averageSaleAmountEl = document.getElementById('averageSaleAmount');
        const topReasonEl = document.getElementById('topReason');
        const reasonCountEl = document.getElementById('reasonCount');
        const profitMarginPercentEl = document.getElementById('profitMarginPercent');
        const totalProfitEl = document.getElementById('totalProfit');
        
        if (peakHourEl && salesAnalysis.peakHour) {
            const hour = salesAnalysis.peakHour.hour;
            const formattedHour = hour < 10 ? `0${hour}:00` : `${hour}:00`;
            peakHourEl.textContent = formattedHour;
            peakHourAmountEl.textContent = `₦${salesAnalysis.peakHour.amount?.toLocaleString() || '0'}`;
        }
        
        if (averageSaleAmountEl) {
            averageSaleAmountEl.textContent = `₦${Math.round(salesAnalysis.averageSale || 0).toLocaleString()}`;
        }
        
        if (topReasonEl && salesAnalysis.topReason) {
            topReasonEl.textContent = salesAnalysis.topReason.reason;
            reasonCountEl.textContent = `${salesAnalysis.topReason.count} sales`;
        }
        
        if (profitMarginPercentEl) {
            profitMarginPercentEl.textContent = `${salesAnalysis.profitMargin || '0'}%`;
            totalProfitEl.textContent = `₦${Math.round(salesAnalysis.totalProfit || 0).toLocaleString()} profit`;
        }
    }
    
    updateSectionTotals(summary) {
        const salesTotal = document.getElementById('salesTotal');
        const stockTotal = document.getElementById('stockTotal');
        const debtTotal = document.getElementById('debtTotal');
        const topProductsTotal = document.getElementById('topProductsTotal');
        const customersTotal = document.getElementById('customersTotal');
        const analysisTotal = document.getElementById('analysisTotal');
        
        if (salesTotal) salesTotal.textContent = `Total: ₦${summary.totalSales.toLocaleString()}`;
        if (stockTotal && this.businessData.stock) {
            stockTotal.textContent = `Total Value: ₦${this.businessData.stock.totalStockValue?.toLocaleString() || '0'}`;
        }
        if (debtTotal) debtTotal.textContent = `Total Owing: ₦${summary.totalDebt.toLocaleString()}`;
        if (topProductsTotal) topProductsTotal.textContent = `Top ${Math.min(this.businessData.topProducts.length, 10)} Products`;
        if (customersTotal) customersTotal.textContent = `Top ${Math.min(this.businessData.customers.length, 10)}`;
        if (analysisTotal) analysisTotal.textContent = `${summary.transactionCount} transactions analyzed`;
    }
    
    updateLastUpdateTime() {
        const updateTimeEl = document.getElementById('updateTime');
        if (updateTimeEl && this.businessData?.summary?.lastSync) {
            const lastUpdate = new Date(this.businessData.summary.lastSync);
            const now = new Date();
            const diffMinutes = Math.floor((now - lastUpdate) / (1000 * 60));
            
            if (diffMinutes < 1) {
                updateTimeEl.textContent = 'Just now';
                updateTimeEl.style.color = '#10b981';
            } else if (diffMinutes < 5) {
                updateTimeEl.textContent = `${diffMinutes} min ago`;
                updateTimeEl.style.color = '#f59e0b';
            } else {
                updateTimeEl.textContent = lastUpdate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                updateTimeEl.style.color = '#6b7280';
            }
        }
    }
    
    updateSalesTable(sales) {
        const tbody = document.getElementById('salesTableBody');
        if (!tbody) return;
        
        if (sales.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="8" style="text-align: center; padding: 40px; color: #666;">
                    📭 No sales recorded today yet
                </td></tr>
            `;
            return;
        }
        
        let html = '';
        
        sales.slice(0, 20).forEach(sale => {
            const time = sale.time || new Date(sale.sale_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const productName = sale.products?.name || sale.product_name || 'Unknown Product';
            const customerName = sale.customer_name || 'Walk-in Customer';
            const paymentMethod = sale.payment_method || 'Cash';
            const reason = sale.reason || 'Regular Sale';
            const profit = sale.total_profit || 0;
            
            html += `
                <tr>
                    <td><strong>${time}</strong></td>
                    <td>${customerName}</td>
                    <td>${productName.substring(0, 30)}</td>
                    <td style="text-align: center;">${sale.quantity}</td>
                    <td>₦${(sale.total_price || 0).toLocaleString()}</td>
                    <td><span class="payment-method">${paymentMethod}</span></td>
                    <td><span class="sale-reason">${reason}</span></td>
                    <td style="color: #10b981;">₦${profit.toLocaleString()}</td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }
    
    updateTopProductsTable(topProducts) {
        const tbody = document.getElementById('topProductsTableBody');
        if (!tbody) return;
        
        if (topProducts.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="7" style="text-align: center; padding: 40px; color: #666;">
                    📦 No product data available
                </td></tr>
            `;
            return;
        }
        
        let html = '';
        
        // Show all products with auto-scroll
        topProducts.forEach((product, index) => {
            const status = product.current_qty <= CEO_CONFIG.STOCK_CRITICAL ? 'critical' :
                          product.current_qty <= CEO_CONFIG.STOCK_WARNING ? 'warning' : 'good';
            
            const reorderNeeded = product.current_qty <= (product.min_qty || CEO_CONFIG.STOCK_WARNING) ? 'YES' : 'NO';
            const stockValue = (product.current_qty || 0) * (product.retail_price || 0);
            const rank = index + 1;
            
            // Add ranking badge
            let rankBadge = '';
            if (rank <= 3) {
                rankBadge = `<span class="rank-badge rank-${rank}">${rank}</span>`;
            }
            
            html += `
                <tr>
                    <td>${rankBadge} <strong>${product.name}</strong></td>
                    <td style="text-align: center;">${product.current_qty}</td>
                    <td style="text-align: center;">${product.sold_today || 0}</td>
                    <td>₦${stockValue.toLocaleString()}</td>
                    <td style="text-align: center;">${product.turnover_rate ? product.turnover_rate.toFixed(1) : '0'}%</td>
                    <td><span class="reorder-${reorderNeeded === 'YES' ? 'needed' : 'ok'}">${reorderNeeded}</span></td>
                    <td><span class="status-${status}">${status.toUpperCase()}</span></td>
                </tr>
            `;
        });
        
        // Add more rows to ensure smooth scrolling if less than 15 products
        if (topProducts.length < 15) {
            for (let i = topProducts.length; i < 15; i++) {
                html += `
                    <tr style="opacity: 0.3;">
                        <td colspan="7" style="text-align: center; color: #ccc;">-</td>
                    </tr>
                `;
            }
        }
        
        tbody.innerHTML = html;
        
        // Add auto-scroll indicator
        const tableContainer = document.querySelector('#topProductsTable').closest('.table-container');
        if (tableContainer && !tableContainer.querySelector('.auto-scroll-indicator')) {
            const indicator = document.createElement('div');
            indicator.className = 'auto-scroll-indicator';
            indicator.innerHTML = '🔄 Auto-scrolling';
            indicator.style.position = 'absolute';
            indicator.style.bottom = '10px';
            indicator.style.right = '10px';
            indicator.style.background = 'rgba(59, 130, 246, 0.9)';
            indicator.style.color = 'white';
            indicator.style.padding = '4px 8px';
            indicator.style.borderRadius = '4px';
            indicator.style.fontSize = '0.8rem';
            indicator.style.zIndex = '10';
            tableContainer.style.position = 'relative';
            tableContainer.appendChild(indicator);
        }
    }
    
    updateStockTable(products) {
        const tbody = document.getElementById('stockTableBody');
        if (!tbody) return;
        
        if (products.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="7" style="text-align: center; padding: 40px; color: #666;">
                    📭 No products in inventory
                </td></tr>
            `;
            return;
        }
        
        let html = '';
        
        products.slice(0, 15).forEach(p => {
            const qty = p.current_qty || 0;
            const min = p.min_qty || CEO_CONFIG.STOCK_WARNING;
            const price = p.retail_price || 0;
            const value = qty * price;
            
            let status = 'good';
            if (qty <= CEO_CONFIG.STOCK_CRITICAL) status = 'critical';
            else if (qty <= CEO_CONFIG.STOCK_WARNING) status = 'warning';
            
            html += `
                <tr>
                    <td><strong>${p.name}</strong></td>
                    <td style="text-align: center;">${qty}</td>
                    <td style="text-align: center;">${min}</td>
                    <td>₦${price.toLocaleString()}</td>
                    <td>₦${value.toLocaleString()}</td>
                    <td style="text-align: center;">${status.toUpperCase()}</td>
                    <td><span class="status-${status}">${status.toUpperCase()}</span></td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }
    
    updateDebtsTable(debts) {
        const tbody = document.getElementById('debtsTableBody');
        if (!tbody) return;
        
        if (debts.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="7" style="text-align: center; padding: 40px; color: #10b981;">
                    ✅ No outstanding debts
                </td></tr>
            `;
            return;
        }
        
        let html = '';
        
        debts.slice(0, 15).forEach(debt => {
            const productName = debt.products?.name || 'Unknown Product';
            const interest = debt.interest_accrued || 0;
            const totalDue = debt.total_due || debt.amount_owing || 0;
            const days = debt.days_owing || 0;
            
            let overdueClass = '';
            if (days > 90) overdueClass = 'overdue-severe';
            else if (days > 30) overdueClass = 'overdue-high';
            
            html += `
                <tr class="${overdueClass}">
                    <td>${debt.customer_name || 'Customer'}</td>
                    <td>${productName}</td>
                    <td>₦${(debt.amount_owing || 0).toLocaleString()}</td>
                    <td style="text-align: center;">${days} days</td>
                    <td>₦${interest.toLocaleString()}</td>
                    <td><strong>₦${totalDue.toLocaleString()}</strong></td>
                    <td>${debt.customer_phone || 'No contact'}</td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }
    
    updateCustomersTable(customers) {
        const tbody = document.getElementById('customersTableBody');
        if (!tbody) return;
        
        if (customers.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="6" style="text-align: center; padding: 40px; color: #666;">
                    👤 No customer data available
                </td></tr>
            `;
            return;
        }
        
        let html = '';
        
        customers.slice(0, 10).forEach(customer => {
            const lastPurchase = customer.last_purchase ? 
                new Date(customer.last_purchase).toLocaleDateString() : 'Never';
            
            html += `
                <tr>
                    <td><strong>${customer.name}</strong></td>
                    <td>₦${customer.total_spent?.toLocaleString() || '0'}</td>
                    <td style="text-align: center;">${customer.purchase_count || 0}</td>
                    <td>₦${Math.round(customer.avg_purchase || 0).toLocaleString()}</td>
                    <td>${lastPurchase}</td>
                    <td>${customer.phone || 'N/A'}</td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }
    
    // PDF REPORT GENERATION - FIXED
    async generatePDFReport() {
        if (!this.businessData) {
            this.showMessage('Please wait for data to load', 'info');
            return;
        }
        
        this.showMessage('Generating PDF report...', 'info');
        
        try {
            const { summary, sales, products, debts, customers, topProducts, salesAnalysis, stock } = this.businessData;
            const now = new Date();
            
            // Check if jsPDF is available
            if (typeof jspdf === 'undefined') {
                // Load jsPDF dynamically
                await this.loadJSPDFLibrary();
            }
            
            // Create PDF document
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a5'
            });
            
            // Set document properties
            doc.setProperties({
                title: `Arijeem Daily Report - ${now.toLocaleDateString()}`,
                subject: 'CEO Business Dashboard Report',
                author: 'Arijeem Enterprises',
                creator: 'CEO Simple Dashboard v2.0'
            });
            
            // Add header
            this.addPDFHeader(doc, now);
            
            // Add summary section
            this.addPDFSummarySection(doc, summary, salesAnalysis);
            
            // Add sales section
            this.addPDFSalesSection(doc, sales);
            
            // Add top products section
            this.addPDFTopProductsSection(doc, topProducts);
            
            // Add stock section
            this.addPDFStockSection(doc, stock);
            
            // Add debts section
            if (debts.length > 0) {
                this.addPDFDebtsSection(doc, debts);
            }
            
            // Add customer insights
            if (customers.length > 0) {
                this.addPDFCustomersSection(doc, customers);
            }
            
            // Add footer
            this.addPDFFooter(doc, now);
            
            // Save the PDF
            const filename = `Arijeem-Report-${now.toISOString().split('T')[0]}.pdf`;
            doc.save(filename);
            
            this.showMessage(`✅ PDF report "${filename}" generated successfully!`, 'success');
            
        } catch (error) {
            console.error('❌ PDF generation error:', error);
            this.showMessage('Failed to generate PDF report. Please try again.', 'error');
        }
    }
    
    async loadJSPDFLibrary() {
        return new Promise((resolve, reject) => {
            if (typeof jspdf !== 'undefined') {
                resolve();
                return;
            }
            
            // Create script element
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            
            script.onload = () => {
                console.log('✅ jsPDF library loaded successfully');
                resolve();
            };
            
            script.onerror = () => {
                console.error('❌ Failed to load jsPDF library');
                reject(new Error('Failed to load PDF library'));
            };
            
            document.head.appendChild(script);
        });
    }
    
    addPDFHeader(doc, date) {
        // Company Header
        doc.setFontSize(20);
        doc.setTextColor(0, 75, 147); // Blue color
        doc.text('ARIJEEM ENTERPRISES', 105, 15, null, null, 'center');
        
        // Report Title
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text('DAILY CEO REPORT', 105, 23, null, null, 'center');
        
        // Date
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        const dateStr = date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        doc.text(dateStr, 105, 30, null, null, 'center');
        
        // Separator line
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 35, 145, 35);
        
        // Timestamp
        doc.setFontSize(10);
        doc.text(`Generated: ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`, 20, 40);
        doc.text('Page 1', 145, 40, null, null, 'right');
    }
    
    addPDFSummarySection(doc, summary, salesAnalysis) {
        doc.setFontSize(14);
        doc.setTextColor(0, 75, 147);
        doc.text('EXECUTIVE SUMMARY', 20, 50);
        
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 52, 145, 52);
        
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        
        const summaryData = [
            ['Total Sales', `₦${summary.totalSales.toLocaleString()}`],
            ['Products Sold', summary.productsSold.toLocaleString()],
            ['Transactions', summary.transactionCount],
            ['Average Sale', `₦${Math.round(salesAnalysis?.averageSale || 0).toLocaleString()}`],
            ['Total Profit', `₦${Math.round(summary.totalProfit || 0).toLocaleString()}`],
            ['Profit Margin', `${summary.profitMargin}%`],
            ['Outstanding Debt', `₦${summary.totalDebt.toLocaleString()}`],
            ['Active Staff', summary.staffCount],
            ['Active Customers', summary.activeCustomers],
            ['Stock Status', summary.stockStatus.toUpperCase()]
        ];
        
        let y = 60;
        summaryData.forEach(([label, value], index) => {
            if (index % 2 === 0) {
                doc.text(label, 25, y);
                doc.text(value, 80, y);
            } else {
                doc.text(label, 90, y);
                doc.text(value, 140, y, null, null, 'right');
                y += 8;
            }
        });
        
        if (summaryData.length % 2 !== 0) {
            y += 8;
        }
        
        doc.setDrawColor(200, 200, 200);
        doc.line(20, y + 5, 145, y + 5);
    }
    
    addPDFSalesSection(doc, sales) {
        doc.addPage();
        
        doc.setFontSize(14);
        doc.setTextColor(0, 75, 147);
        doc.text('TODAY\'S SALES DETAILS', 20, 20);
        
        if (sales.length === 0) {
            doc.setFontSize(11);
            doc.setTextColor(100, 100, 100);
            doc.text('No sales recorded today', 20, 30);
            return;
        }
        
        // Table header
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.setFillColor(0, 75, 147);
        doc.rect(20, 30, 125, 8, 'F');
        doc.text('Time', 22, 36);
        doc.text('Customer', 40, 36);
        doc.text('Product', 80, 36);
        doc.text('Qty', 115, 36);
        doc.text('Amount', 125, 36);
        doc.text('Reason', 145, 36);
        
        // Sales rows
        doc.setTextColor(0, 0, 0);
        let y = 40;
        
        sales.slice(0, 20).forEach(sale => {
            if (y > 180) {
                doc.addPage();
                y = 20;
                // Add header for new page
                doc.setFontSize(10);
                doc.setTextColor(255, 255, 255);
                doc.setFillColor(0, 75, 147);
                doc.rect(20, y, 125, 8, 'F');
                doc.text('Time', 22, y + 6);
                doc.text('Customer', 40, y + 6);
                doc.text('Product', 80, y + 6);
                doc.text('Qty', 115, y + 6);
                doc.text('Amount', 125, y + 6);
                doc.text('Reason', 145, y + 6);
                y += 15;
            }
            
            const time = sale.time || new Date(sale.sale_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const productName = (sale.products?.name || sale.product_name || 'Product').substring(0, 20);
            const customerName = (sale.customer_name || 'Walk-in').substring(0, 15);
            const reason = (sale.reason || 'Sale').substring(0, 15);
            
            doc.setFontSize(9);
            doc.text(time, 22, y);
            doc.text(customerName, 40, y);
            doc.text(productName, 80, y);
            doc.text(sale.quantity?.toString() || '0', 115, y);
            doc.text(`₦${(sale.total_price || 0).toLocaleString()}`, 125, y);
            doc.text(reason, 145, y);
            y += 8;
        });
    }
    
    addPDFTopProductsSection(doc, topProducts) {
        doc.addPage();
        
        doc.setFontSize(14);
        doc.setTextColor(0, 75, 147);
        doc.text('TOP PERFORMING PRODUCTS', 20, 20);
        
        if (topProducts.length === 0) {
            doc.setFontSize(11);
            doc.setTextColor(100, 100, 100);
            doc.text('No product data available', 20, 30);
            return;
        }
        
        // Table header
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.setFillColor(0, 75, 147);
        doc.rect(20, 30, 125, 8, 'F');
        doc.text('Product', 22, 36);
        doc.text('Stock', 80, 36);
        doc.text('Sold Today', 100, 36);
        doc.text('Value', 120, 36);
        doc.text('Status', 140, 36);
        
        // Product rows
        doc.setTextColor(0, 0, 0);
        let y = 40;
        
        topProducts.slice(0, 10).forEach(product => {
            if (y > 180) {
                doc.addPage();
                y = 20;
                // Add header for new page
                doc.setFontSize(10);
                doc.setTextColor(255, 255, 255);
                doc.setFillColor(0, 75, 147);
                doc.rect(20, y, 125, 8, 'F');
                doc.text('Product', 22, y + 6);
                doc.text('Stock', 80, y + 6);
                doc.text('Sold Today', 100, y + 6);
                doc.text('Value', 120, y + 6);
                doc.text('Status', 140, y + 6);
                y += 15;
            }
            
            const status = product.current_qty <= CEO_CONFIG.STOCK_CRITICAL ? 'CRITICAL' :
                          product.current_qty <= CEO_CONFIG.STOCK_WARNING ? 'LOW' : 'GOOD';
            const stockValue = (product.current_qty || 0) * (product.retail_price || 0);
            
            doc.setFontSize(9);
            doc.text(product.name.substring(0, 25), 22, y);
            doc.text(product.current_qty.toString(), 80, y);
            doc.text(product.sold_today?.toString() || '0', 100, y);
            doc.text(`₦${stockValue.toLocaleString()}`, 120, y);
            doc.text(status, 140, y);
            y += 8;
        });
    }
    
    addPDFStockSection(doc, stock) {
        doc.addPage();
        
        doc.setFontSize(14);
        doc.setTextColor(0, 75, 147);
        doc.text('STOCK STATUS ANALYSIS', 20, 20);
        
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(`Total Stock Value: ₦${stock.totalStockValue?.toLocaleString() || '0'}`, 20, 30);
        doc.text(`Critical Items: ${stock.criticalCount || 0}`, 20, 37);
        doc.text(`Warning Items: ${stock.warningCount || 0}`, 20, 44);
        doc.text(`Good Items: ${stock.goodCount || 0}`, 20, 51);
        
        // Critical items list
        if (stock.critical.length > 0) {
            doc.setFontSize(12);
            doc.setTextColor(255, 0, 0);
            doc.text('URGENT - NEEDS IMMEDIATE RESTOCK:', 20, 65);
            
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            let y = 75;
            stock.critical.slice(0, 10).forEach(item => {
                doc.text(`• ${item.name} - ${item.current_qty} units left (Min: ${item.min_qty || CEO_CONFIG.STOCK_WARNING})`, 25, y);
                y += 7;
            });
        }
    }
    
    addPDFDebtsSection(doc, debts) {
        doc.addPage();
        
        doc.setFontSize(14);
        doc.setTextColor(0, 75, 147);
        doc.text('OUTSTANDING DEBTS', 20, 20);
        
        if (debts.length === 0) {
            doc.setFontSize(11);
            doc.setTextColor(100, 100, 100);
            doc.text('No outstanding debts', 20, 30);
            return;
        }
        
        // Table header
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.setFillColor(220, 53, 69);
        doc.rect(20, 30, 125, 8, 'F');
        doc.text('Customer', 22, 36);
        doc.text('Amount Owing', 80, 36);
        doc.text('Days', 110, 36);
        doc.text('Total Due', 130, 36);
        doc.text('Contact', 150, 36);
        
        // Debt rows
        doc.setTextColor(0, 0, 0);
        let y = 40;
        
        debts.slice(0, 15).forEach(debt => {
            if (y > 180) {
                doc.addPage();
                y = 20;
                // Add header for new page
                doc.setFontSize(10);
                doc.setTextColor(255, 255, 255);
                doc.setFillColor(220, 53, 69);
                doc.rect(20, y, 125, 8, 'F');
                doc.text('Customer', 22, y + 6);
                doc.text('Amount Owing', 80, y + 6);
                doc.text('Days', 110, y + 6);
                doc.text('Total Due', 130, y + 6);
                doc.text('Contact', 150, y + 6);
                y += 15;
            }
            
            const totalDue = debt.total_due || debt.amount_owing || 0;
            const customerName = (debt.customer_name || 'Customer').substring(0, 20);
            const contact = (debt.customer_phone || 'N/A').substring(0, 10);
            
            doc.setFontSize(9);
            doc.text(customerName, 22, y);
            doc.text(`₦${(debt.amount_owing || 0).toLocaleString()}`, 80, y);
            doc.text((debt.days_owing || 0).toString(), 110, y);
            doc.text(`₦${totalDue.toLocaleString()}`, 130, y);
            doc.text(contact, 150, y);
            y += 8;
        });
    }
    
    addPDFCustomersSection(doc, customers) {
        doc.addPage();
        
        doc.setFontSize(14);
        doc.setTextColor(0, 75, 147);
        doc.text('TOP CUSTOMER INSIGHTS', 20, 20);
        
        if (customers.length === 0) {
            doc.setFontSize(11);
            doc.setTextColor(100, 100, 100);
            doc.text('No customer data available', 20, 30);
            return;
        }
        
        // Table header
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.setFillColor(76, 175, 80);
        doc.rect(20, 30, 125, 8, 'F');
        doc.text('Customer', 22, 36);
        doc.text('Total Spent', 80, 36);
        doc.text('Purchases', 110, 36);
        doc.text('Avg Purchase', 130, 36);
        doc.text('Last Purchase', 150, 36);
        
        // Customer rows
        doc.setTextColor(0, 0, 0);
        let y = 40;
        
        customers.slice(0, 10).forEach(customer => {
            if (y > 180) {
                doc.addPage();
                y = 20;
                // Add header for new page
                doc.setFontSize(10);
                doc.setTextColor(255, 255, 255);
                doc.setFillColor(76, 175, 80);
                doc.rect(20, y, 125, 8, 'F');
                doc.text('Customer', 22, y + 6);
                doc.text('Total Spent', 80, y + 6);
                doc.text('Purchases', 110, y + 6);
                doc.text('Avg Purchase', 130, y + 6);
                doc.text('Last Purchase', 150, y + 6);
                y += 15;
            }
            
            const lastPurchase = customer.last_purchase ? 
                new Date(customer.last_purchase).toLocaleDateString() : 'Never';
            const customerName = customer.name.substring(0, 20);
            
            doc.setFontSize(9);
            doc.text(customerName, 22, y);
            doc.text(`₦${customer.total_spent?.toLocaleString() || '0'}`, 80, y);
            doc.text(customer.purchase_count?.toString() || '0', 110, y);
            doc.text(`₦${Math.round(customer.avg_purchase || 0).toLocaleString()}`, 130, y);
            doc.text(lastPurchase, 150, y);
            y += 8;
        });
    }
    
    addPDFFooter(doc, date) {
        const pageCount = doc.internal.getNumberOfPages();
        
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            
            // Footer separator
            doc.setDrawColor(200, 200, 200);
            doc.line(20, 195, 145, 195);
            
            // Footer text
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(CEO_CONFIG.COMPANY_ADDRESS, 105, 200, null, null, 'center');
            doc.text(`Page ${i} of ${pageCount} | Generated ${date.toLocaleDateString()}`, 105, 205, null, null, 'center');
            doc.text('Confidential - For CEO Use Only', 105, 210, null, null, 'center');
        }
    }
    
    // LOGOUT
    logoutCEO() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('ceo_user');
            localStorage.removeItem('ceo_email');
            this.currentCEO = null;
            this.businessData = null;
            
            // Clear timers
            if (this.autoReportTimer) clearInterval(this.autoReportTimer);
            if (this.autoSyncTimer) clearInterval(this.autoSyncTimer);
            if (this.updateInterval) clearInterval(this.updateInterval);
            if (this.scrollInterval) clearInterval(this.scrollInterval);
            
            this.showCreateAccountScreen();
            this.showMessage('Logged out successfully', 'success');
        }
    }
    
    // AUTO-LOGIN CHECK
    checkAutoLogin() {
        const userStr = localStorage.getItem('ceo_user');
        const email = localStorage.getItem('ceo_email');
        
        if (userStr && email) {
            try {
                this.currentCEO = JSON.parse(userStr);
                this.showDashboard();
                this.loadBusinessData();
                this.showMessage(`Welcome back, ${this.currentCEO.name}!`, 'success');
            } catch (error) {
                console.error('❌ Auto-login error:', error);
                localStorage.clear();
            }
        }
    }
    
    // CLEANUP
    cleanup() {
        if (this.autoReportTimer) clearInterval(this.autoReportTimer);
        if (this.autoSyncTimer) clearInterval(this.autoSyncTimer);
        if (this.updateInterval) clearInterval(this.updateInterval);
        if (this.scrollInterval) clearInterval(this.scrollInterval);
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 CEO Dashboard starting...');
    
    // Initialize dashboard controller
    window.ceoDashboard = new CEODashboard();
    
    // Start with account creation screen
    window.ceoDashboard.showCreateAccountScreen();
    
    console.log('✅ CEO Dashboard started successfully');
});

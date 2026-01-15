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
        this.scrollSpeed = 1;
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
        
        // Add manual refresh button event
        const manualRefreshBtn = document.getElementById('manualRefreshBtn');
        if (!manualRefreshBtn) {
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
        }, 50);
    }
    
    scrollTopProducts() {
        const tableContainer = document.querySelector('#topProductsTable').closest('.table-container');
        
        if (tableContainer) {
            // If we've scrolled to the bottom, reset to top
            if (this.currentScrollPosition >= (tableContainer.scrollHeight - tableContainer.clientHeight)) {
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
        
        this.updateInterval = setInterval(() => {
            if (this.currentCEO && document.getElementById('dashboardScreen').style.display !== 'none') {
                this.loadBusinessData(true);
            }
        }, 30000);
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
                this.loadBusinessData(true);
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
        
        this.updateBigNumbers(summary, salesAnalysis);
        this.updateStockAlert(summary, stock);
        this.updateSalesAnalysis(salesAnalysis);
        this.updateSalesTable(sales);
        this.updateTopProductsTable(topProducts);
        this.updateStockTable(products);
        this.updateDebtsTable(debts);
        this.updateCustomersTable(customers);
        this.updateConnectionStatus();
        this.updateLastUpdateTime();
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
        
        topProducts.forEach((product, index) => {
            const status = product.current_qty <= CEO_CONFIG.STOCK_CRITICAL ? 'critical' :
                          product.current_qty <= CEO_CONFIG.STOCK_WARNING ? 'warning' : 'good';
            
            const reorderNeeded = product.current_qty <= (product.min_qty || CEO_CONFIG.STOCK_WARNING) ? 'YES' : 'NO';
            const stockValue = (product.current_qty || 0) * (product.retail_price || 0);
            const rank = index + 1;
            
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
    
    // PDF REPORT GENERATION - SIMPLIFIED VERSION THAT WORKS
    async generatePDFReport() {
        try {
            if (!this.businessData) {
                this.showMessage('Please wait for data to load', 'info');
                return;
            }
            
            this.showMessage('Generating PDF report...', 'info');
            
            // Check if jsPDF is loaded
            if (typeof jspdf === 'undefined') {
                // Load jsPDF if not already loaded
                await this.loadJSPDFLibrary();
            }
            
            // Get business data
            const { summary, sales, products, debts, customers, topProducts, salesAnalysis, stock } = this.businessData;
            const now = new Date();
            
            // Create PDF
            const doc = new window.jspdf.jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a5'
            });
            
            // Add header
            doc.setFontSize(20);
            doc.setTextColor(0, 75, 147);
            doc.text('ARIJEEM ENTERPRISES', 105, 15, null, null, 'center');
            
            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.text('DAILY CEO REPORT', 105, 23, null, null, 'center');
            
            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            doc.text(now.toLocaleDateString(), 105, 30, null, null, 'center');
            
            // Add summary
            doc.setFontSize(14);
            doc.setTextColor(0, 75, 147);
            doc.text('SUMMARY', 20, 45);
            
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            
            let y = 55;
            const summaryItems = [
                `Total Sales: ₦${summary.totalSales.toLocaleString()}`,
                `Products Sold: ${summary.productsSold}`,
                `Transactions: ${summary.transactionCount}`,
                `Profit Margin: ${summary.profitMargin}%`,
                `Outstanding Debt: ₦${summary.totalDebt.toLocaleString()}`,
                `Active Staff: ${summary.staffCount}`,
                `Stock Status: ${summary.stockStatus.toUpperCase()}`
            ];
            
            summaryItems.forEach(item => {
                doc.text(item, 25, y);
                y += 8;
            });
            
            // Add sales section
            if (sales.length > 0) {
                doc.addPage();
                y = 20;
                
                doc.setFontSize(14);
                doc.setTextColor(0, 75, 147);
                doc.text('TODAY\'S SALES', 20, y);
                y += 10;
                
                doc.setFontSize(10);
                sales.slice(0, 15).forEach(sale => {
                    if (y > 180) {
                        doc.addPage();
                        y = 20;
                    }
                    
                    const time = sale.time || new Date(sale.sale_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    const productName = (sale.products?.name || sale.product_name || 'Product').substring(0, 20);
                    const amount = sale.total_price || 0;
                    
                    doc.text(`${time} - ${productName}`, 25, y);
                    doc.text(`₦${amount.toLocaleString()}`, 130, y, null, null, 'right');
                    y += 8;
                });
            }
            
            // Add top products section
            if (topProducts.length > 0) {
                doc.addPage();
                y = 20;
                
                doc.setFontSize(14);
                doc.setTextColor(0, 75, 147);
                doc.text('TOP PRODUCTS', 20, y);
                y += 10;
                
                doc.setFontSize(10);
                topProducts.slice(0, 10).forEach((product, index) => {
                    if (y > 180) {
                        doc.addPage();
                        y = 20;
                    }
                    
                    const stockValue = (product.current_qty || 0) * (product.retail_price || 0);
                    
                    doc.text(`${index + 1}. ${product.name.substring(0, 25)}`, 25, y);
                    doc.text(`Stock: ${product.current_qty}`, 100, y);
                    doc.text(`Value: ₦${stockValue.toLocaleString()}`, 130, y, null, null, 'right');
                    y += 8;
                });
            }
            
            // Add stock alert section
            if (stock.critical.length > 0) {
                doc.addPage();
                y = 20;
                
                doc.setFontSize(14);
                doc.setTextColor(255, 0, 0);
                doc.text('URGENT STOCK ALERTS', 20, y);
                y += 10;
                
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);
                stock.critical.slice(0, 10).forEach(item => {
                    doc.text(`• ${item.name} - ${item.current_qty} units left`, 25, y);
                    y += 7;
                });
            }
            
            // Add debts section
            if (debts.length > 0) {
                doc.addPage();
                y = 20;
                
                doc.setFontSize(14);
                doc.setTextColor(0, 75, 147);
                doc.text('OUTSTANDING DEBTS', 20, y);
                y += 10;
                
                doc.setFontSize(10);
                debts.slice(0, 10).forEach(debt => {
                    const totalDue = debt.total_due || debt.amount_owing || 0;
                    doc.text(`${debt.customer_name || 'Customer'}: ₦${totalDue.toLocaleString()}`, 25, y);
                    y += 8;
                });
            }
            
            // Save PDF
            const filename = `Arijeem-Report-${now.toISOString().split('T')[0]}.pdf`;
            doc.save(filename);
            
            this.showMessage(`✅ PDF report generated: ${filename}`, 'success');
            
        } catch (error) {
            console.error('PDF Generation Error:', error);
            this.showMessage(`Failed to generate PDF: ${error.message}`, 'error');
        }
    }
    
    async loadJSPDFLibrary() {
        return new Promise((resolve, reject) => {
            if (typeof jspdf !== 'undefined') {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load jsPDF'));
            document.head.appendChild(script);
        });
    }
    
    // LOGOUT
    logoutCEO() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('ceo_user');
            localStorage.removeItem('ceo_email');
            this.currentCEO = null;
            this.businessData = null;
            
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

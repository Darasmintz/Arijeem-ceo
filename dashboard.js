// CEO DASHBOARD CONTROLLER
console.log('👑 Starting CEO Dashboard...');

class CEODashboard {
    constructor() {
        this.currentCEO = null;
        this.businessData = null;
        this.autoSyncTimer = null;
        this.init();
    }
    
    async init() {
        try {
            console.log('🚀 Dashboard initializing...');
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Check for auto-login
            setTimeout(() => this.checkAutoLogin(), 1000);
            
            // Start periodic updates
            this.startPeriodicUpdates();
            
            console.log('✅ Dashboard ready');
            
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
        
        // Navigation
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
                this.showCreateAccountScreen();
            };
        }
    }
    
    startPeriodicUpdates() {
        // Clear existing timer
        if (this.autoSyncTimer) clearInterval(this.autoSyncTimer);
        
        this.autoSyncTimer = setInterval(() => {
            if (this.currentCEO && document.getElementById('dashboardScreen').style.display !== 'none') {
                this.loadBusinessData(true);
            }
        }, CEO_CONFIG.SYNC_INTERVAL);
    }
    
    // MESSAGE HANDLER
    showMessage(text, type = 'info') {
        try {
            // Create message element
            const msg = document.createElement('div');
            msg.className = 'message';
            msg.innerHTML = `
                <div style="position: fixed; top: 20px; right: 20px; background: white; padding: 15px 25px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-left: 5px solid ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'}; z-index: 1000; display: flex; align-items: center; gap: 10px;">
                    <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
                    <span>${text}</span>
                </div>
            `;
            document.body.appendChild(msg);
            
            setTimeout(() => {
                if (msg.parentElement) msg.remove();
            }, CEO_CONFIG.MESSAGE_DISPLAY_TIME);
            
        } catch (error) {
            console.error('Show message error:', error);
        }
    }
    
    // CREATE CEO ACCOUNT
    async createCEOAccount() {
        try {
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
            if (btn) {
                btn.innerHTML = '⏳ CREATING...';
                btn.disabled = true;
            }
            
            this.showMessage('Creating account...');
            
            // Create account
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
            
            // Auto login
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
            console.error('Create account error:', error);
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
            console.error('Login error:', error);
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
            document.getElementById('dashboardTitle').textContent = `👑 ${this.currentCEO.name}'s DASHBOARD`;
            this.updateWelcomeMessage();
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
    }
    
    // FORCE REFRESH
    async forceRefreshData() {
        try {
            const refreshBtn = document.querySelector('.btn-refresh');
            if (refreshBtn) {
                refreshBtn.innerHTML = '⏳ REFRESHING...';
                refreshBtn.disabled = true;
            }
            
            this.showMessage('Refreshing data...', 'info');
            
            const refreshed = await window.ceoDB.forceRefresh();
            
            if (refreshed) {
                this.showMessage('Data refreshed!', 'success');
                await this.loadBusinessData();
            } else {
                this.showMessage('Refresh failed', 'warning');
            }
            
        } catch (error) {
            console.error('Force refresh error:', error);
            this.showMessage('Refresh failed', 'error');
        } finally {
            setTimeout(() => {
                const refreshBtn = document.querySelector('.btn-refresh');
                if (refreshBtn) {
                    refreshBtn.innerHTML = '🔄 REFRESH NOW';
                    refreshBtn.disabled = false;
                }
            }, 2000);
        }
    }
    
    // LOAD BUSINESS DATA - FIXED
    async loadBusinessData(silent = false) {
        try {
            if (!silent) {
                this.showLoadingIndicator(true);
            }
            
            console.log('🔄 Loading business data...');
            this.businessData = await window.ceoDB.getBusinessData();
            
            this.updateDashboard();
            this.updateConnectionStatus();
            
            if (!silent) {
                const dataAge = this.businessData?.summary?.lastUpdate ? 
                    Math.floor((new Date() - new Date(this.businessData.summary.lastUpdate)) / 1000) : 999;
                
                if (dataAge < 60) {
                    this.showMessage('Data loaded successfully', 'success');
                } else {
                    this.showMessage('Data loaded', 'info');
                }
            }
            
        } catch (error) {
            console.error('Load business data error:', error);
            this.showMessage('Failed to load data', 'error');
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
        }
    }
    
    updateConnectionStatus() {
        const statusEl = document.getElementById('connectionStatus');
        const detailEl = document.getElementById('connectionDetail');
        
        if (this.businessData?.isConnected) {
            if (statusEl) {
                statusEl.textContent = '✅ Connected to main system';
                statusEl.className = 'connection-good';
            }
            if (detailEl) {
                detailEl.textContent = 'Live data connection active';
            }
        } else {
            if (statusEl) {
                statusEl.textContent = '⚠️ Using cached data';
                statusEl.className = 'connection-warning';
            }
            if (detailEl) {
                detailEl.textContent = 'No active connection';
            }
        }
    }
    
    // UPDATE DASHBOARD - FIXED
    updateDashboard() {
        if (!this.businessData) {
            console.log('⚠️ No business data to update');
            return;
        }
        
        const { summary, sales, products, debts, customers, stock, topProducts, salesAnalysis } = this.businessData;
        
        console.log(`📊 Updating dashboard with ${sales?.length || 0} sales, ${products?.length || 0} products`);
        
        this.updateBigNumbers(summary, salesAnalysis);
        this.updateStockAlert(stock);
        this.updateSalesAnalysis(salesAnalysis);
        this.updateSalesTable(sales);
        this.updateTopProductsTable(topProducts);
        this.updateStockTable(products);
        this.updateDebtsTable(debts);
        this.updateCustomersTable(customers || []);
        this.updateLastUpdateTime();
    }
    
    // FIXED: This was causing the error
    updateBigNumbers(summary, salesAnalysis) {
        const totalSalesEl = document.getElementById('totalSales');
        const productsSoldEl = document.getElementById('productsSold');
        const staffCountEl = document.getElementById('staffCount');
        const totalDebtEl = document.getElementById('totalDebt');
        const transactionCountEl = document.getElementById('transactionCount');
        const averageSaleEl = document.getElementById('averageSale');
        const customerCountEl = document.getElementById('customerCount');
        const profitMarginEl = document.getElementById('profitMargin');
        
        if (totalSalesEl) totalSalesEl.textContent = `₦${(summary?.totalSales || 0).toLocaleString()}`;
        if (productsSoldEl) productsSoldEl.textContent = (summary?.productsSold || 0).toLocaleString();
        if (staffCountEl) staffCountEl.textContent = (summary?.staffCount || 0).toLocaleString();
        if (totalDebtEl) totalDebtEl.textContent = `₦${(summary?.totalDebt || 0).toLocaleString()}`;
        if (transactionCountEl) transactionCountEl.textContent = `${summary?.transactionCount || 0} transactions`;
        if (averageSaleEl) averageSaleEl.textContent = `Avg: ₦${Math.round(salesAnalysis?.averageSale || 0).toLocaleString()}`;
        if (customerCountEl) customerCountEl.textContent = `${summary?.activeCustomers || 0} customers`; // FIXED LINE
        if (profitMarginEl) profitMarginEl.textContent = `Margin: ${summary?.profitMargin || '0'}%`;
    }
    
    updateStockAlert(stock) {
        const statusText = document.getElementById('stockStatusText');
        const stockMessage = document.getElementById('stockMessage');
        const criticalCount = document.getElementById('criticalCount');
        const warningCount = document.getElementById('warningCount');
        const goodCount = document.getElementById('goodCount');
        
        if (statusText) {
            statusText.textContent = (stock?.status || 'unknown').toUpperCase();
        }
        
        if (stockMessage) {
            let msg = 'Analyzing inventory...';
            if (stock?.critical?.length > 0) {
                msg = `🚨 ${stock.critical.length} products need immediate restock`;
            } else if (stock?.warning?.length > 0) {
                msg = `⚠️ ${stock.warning.length} products running low`;
            } else if (stock?.good?.length > 0) {
                msg = '✅ All stock levels are good';
            }
            stockMessage.textContent = msg;
        }
        
        if (criticalCount) {
            criticalCount.textContent = `${stock?.critical?.length || 0} critical`;
            criticalCount.style.display = stock?.critical?.length > 0 ? 'inline-block' : 'none';
        }
        if (warningCount) {
            warningCount.textContent = `${stock?.warning?.length || 0} warning`;
            warningCount.style.display = stock?.warning?.length > 0 ? 'inline-block' : 'none';
        }
        if (goodCount) {
            goodCount.textContent = `${stock?.good?.length || 0} good`;
            goodCount.style.display = stock?.good?.length > 0 ? 'inline-block' : 'none';
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
        const analysisTotalEl = document.getElementById('analysisTotal');
        
        if (peakHourEl) peakHourEl.textContent = 'N/A';
        if (peakHourAmountEl) peakHourAmountEl.textContent = '₦0';
        if (averageSaleAmountEl) averageSaleAmountEl.textContent = `₦${Math.round(salesAnalysis?.averageSale || 0).toLocaleString()}`;
        if (topReasonEl) topReasonEl.textContent = 'Regular Sale';
        if (reasonCountEl) reasonCountEl.textContent = '0 sales';
        if (profitMarginPercentEl) profitMarginPercentEl.textContent = `${salesAnalysis?.profitMargin || '0'}%`;
        if (totalProfitEl) totalProfitEl.textContent = `₦${Math.round(salesAnalysis?.totalProfit || 0).toLocaleString()} profit`;
        if (analysisTotalEl) analysisTotalEl.textContent = `${salesAnalysis?.transactionCount || 0} transactions analyzed`;
    }
    
    updateLastUpdateTime() {
        const updateTimeEl = document.getElementById('updateTime');
        if (updateTimeEl && this.businessData?.summary?.lastUpdate) {
            const lastUpdate = new Date(this.businessData.summary.lastUpdate);
            updateTimeEl.textContent = lastUpdate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
    }
    
    updateSalesTable(sales) {
        const tbody = document.getElementById('salesTableBody');
        const totalEl = document.getElementById('salesTotal');
        
        if (!tbody) return;
        
        if (!sales || sales.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="8" style="text-align: center; padding: 40px; color: #666;">
                    📭 No sales recorded today yet
                </td></tr>
            `;
            if (totalEl) totalEl.textContent = 'Total: ₦0';
            return;
        }
        
        let html = '';
        const total = sales.reduce((sum, s) => sum + (s.total_price || 0), 0);
        
        sales.slice(0, 15).forEach(sale => {
            html += `
                <tr>
                    <td><strong>${sale.time || 'N/A'}</strong></td>
                    <td>${sale.customer_name || 'Customer'}</td>
                    <td>${sale.product_name || 'Product'}</td>
                    <td style="text-align: center;">${sale.quantity || 0}</td>
                    <td>₦${(sale.total_price || 0).toLocaleString()}</td>
                    <td><span class="payment-method">${sale.payment_method || 'cash'}</span></td>
                    <td><span class="sale-reason">${sale.reason || 'Sale'}</span></td>
                    <td style="color: #10b981;">₦${Math.round(((sale.total_price || 0) * 0.3)).toLocaleString()}</td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        if (totalEl) totalEl.textContent = `Total: ₦${total.toLocaleString()}`;
    }
    
    updateTopProductsTable(products) {
        const tbody = document.getElementById('topProductsTableBody');
        const totalEl = document.getElementById('topProductsTotal');
        
        if (!tbody) return;
        
        if (!products || products.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="7" style="text-align: center; padding: 40px; color: #666;">
                    📦 No product data available
                </td></tr>
            `;
            if (totalEl) totalEl.textContent = 'Top 0 Products';
            return;
        }
        
        let html = '';
        
        products.slice(0, 10).forEach((product, index) => {
            const qty = product.current_qty || 0;
            const status = qty <= CEO_CONFIG.STOCK_CRITICAL ? 'critical' :
                          qty <= CEO_CONFIG.STOCK_WARNING ? 'warning' : 'good';
            
            const reorderNeeded = qty <= CEO_CONFIG.STOCK_WARNING ? 'YES' : 'NO';
            const stockValue = qty * (product.retail_price || 0);
            
            html += `
                <tr>
                    <td><strong>${product.name || 'Product'}</strong></td>
                    <td style="text-align: center;">${qty}</td>
                    <td style="text-align: center;">0</td>
                    <td>₦${stockValue.toLocaleString()}</td>
                    <td style="text-align: center;">0%</td>
                    <td><span class="reorder-${reorderNeeded === 'YES' ? 'needed' : 'ok'}">${reorderNeeded}</span></td>
                    <td><span class="status-${status}">${status.toUpperCase()}</span></td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        if (totalEl) totalEl.textContent = `Top ${Math.min(products.length, 10)} Products`;
    }
    
    updateStockTable(products) {
        const tbody = document.getElementById('stockTableBody');
        const totalEl = document.getElementById('stockTotal');
        
        if (!tbody) return;
        
        if (!products || products.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="7" style="text-align: center; padding: 40px; color: #666;">
                    📭 No products in inventory
                </td></tr>
            `;
            if (totalEl) totalEl.textContent = 'Total Value: ₦0';
            return;
        }
        
        let html = '';
        let totalValue = 0;
        
        products.slice(0, 15).forEach(p => {
            const qty = p.current_qty || 0;
            const price = p.retail_price || 0;
            const value = qty * price;
            totalValue += value;
            
            let status = 'good';
            if (qty <= CEO_CONFIG.STOCK_CRITICAL) status = 'critical';
            else if (qty <= CEO_CONFIG.STOCK_WARNING) status = 'warning';
            
            html += `
                <tr>
                    <td><strong>${p.name || 'Product'}</strong></td>
                    <td style="text-align: center;">${qty}</td>
                    <td style="text-align: center;">${CEO_CONFIG.STOCK_WARNING}</td>
                    <td>₦${price.toLocaleString()}</td>
                    <td>₦${value.toLocaleString()}</td>
                    <td style="text-align: center;">${status.toUpperCase()}</td>
                    <td><span class="status-${status}">${status.toUpperCase()}</span></td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        if (totalEl) totalEl.textContent = `Total Value: ₦${totalValue.toLocaleString()}`;
    }
    
    updateDebtsTable(debts) {
        const tbody = document.getElementById('debtsTableBody');
        const totalEl = document.getElementById('debtTotal');
        
        if (!tbody) return;
        
        if (!debts || debts.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="7" style="text-align: center; padding: 40px; color: #10b981;">
                    ✅ No outstanding debts
                </td></tr>
            `;
            if (totalEl) totalEl.textContent = 'Total Owing: ₦0';
            return;
        }
        
        let html = '';
        const total = debts.reduce((sum, d) => sum + (d.amount_owing || 0), 0);
        
        debts.slice(0, 15).forEach(debt => {
            const days = debt.days_owing || 0;
            let overdueClass = '';
            if (days > 90) overdueClass = 'overdue-severe';
            else if (days > 30) overdueClass = 'overdue-high';
            
            html += `
                <tr class="${overdueClass}">
                    <td>${debt.customer_name || 'Customer'}</td>
                    <td>Product</td>
                    <td>₦${(debt.amount_owing || 0).toLocaleString()}</td>
                    <td style="text-align: center;">${days} days</td>
                    <td>₦0</td>
                    <td><strong>₦${(debt.amount_owing || 0).toLocaleString()}</strong></td>
                    <td>N/A</td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        if (totalEl) totalEl.textContent = `Total Owing: ₦${total.toLocaleString()}`;
    }
    
    updateCustomersTable(customers) {
        const tbody = document.getElementById('customersTableBody');
        const totalEl = document.getElementById('customersTotal');
        
        if (!tbody) return;
        
        if (!customers || customers.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="6" style="text-align: center; padding: 40px; color: #666;">
                    👤 No customer data available
                </td></tr>
            `;
            if (totalEl) totalEl.textContent = 'Top 0';
            return;
        }
        
        let html = '';
        
        customers.slice(0, 10).forEach(customer => {
            html += `
                <tr>
                    <td><strong>${customer.name || 'Customer'}</strong></td>
                    <td>₦${(customer.total_spent || 0).toLocaleString()}</td>
                    <td style="text-align: center;">${customer.purchase_count || 0}</td>
                    <td>₦${Math.round((customer.total_spent || 0) / Math.max(customer.purchase_count || 1, 1)).toLocaleString()}</td>
                    <td>Today</td>
                    <td>${customer.phone || 'N/A'}</td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        if (totalEl) totalEl.textContent = `Top ${Math.min(customers.length, 10)}`;
    }
    
    // PDF REPORT
    async generatePDFReport() {
        try {
            if (!this.businessData) {
                this.showMessage('Please wait for data to load', 'info');
                return;
            }
            
            this.showMessage('Generating PDF report...', 'info');
            
            // Check if jsPDF is available
            if (typeof jspdf === 'undefined') {
                // Load jsPDF
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                script.onload = () => this.createPDF();
                document.head.appendChild(script);
            } else {
                this.createPDF();
            }
            
        } catch (error) {
            console.error('PDF generation error:', error);
            this.showMessage('Failed to generate PDF', 'error');
        }
    }
    
    createPDF() {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Add title
            doc.setFontSize(20);
            doc.text('Arijeem Insight 360 - CEO Report', 20, 20);
            
            // Add date
            doc.setFontSize(12);
            doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 30);
            
            // Add summary
            doc.setFontSize(16);
            doc.text('Business Summary', 20, 50);
            
            const summary = this.businessData.summary;
            doc.setFontSize(12);
            doc.text(`Total Sales Today: ₦${(summary.totalSales || 0).toLocaleString()}`, 30, 65);
            doc.text(`Products Sold: ${summary.productsSold || 0}`, 30, 75);
            doc.text(`Outstanding Debt: ₦${(summary.totalDebt || 0).toLocaleString()}`, 30, 85);
            doc.text(`Profit Margin: ${summary.profitMargin || '0'}%`, 30, 95);
            
            // Save PDF
            doc.save(`Arijeem-Report-${new Date().toISOString().split('T')[0]}.pdf`);
            
            this.showMessage('PDF report generated!', 'success');
            
        } catch (error) {
            console.error('PDF creation error:', error);
            this.showMessage('Failed to create PDF', 'error');
        }
    }
    
    // LOGOUT
    logoutCEO() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('ceo_user');
            localStorage.removeItem('ceo_email');
            this.currentCEO = null;
            this.businessData = null;
            
            if (this.autoSyncTimer) clearInterval(this.autoSyncTimer);
            
            this.showCreateAccountScreen();
            this.showMessage('Logged out successfully', 'success');
        }
    }
    
    // AUTO-LOGIN
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
                console.error('Auto-login error:', error);
                localStorage.clear();
            }
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 CEO Dashboard starting...');
    window.ceoDashboard = new CEODashboard();
    window.ceoDashboard.showCreateAccountScreen();
    console.log('✅ CEO Dashboard started successfully');
});

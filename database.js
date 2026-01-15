// CEO DASHBOARD - SYNC WITH MAIN SYSTEM
console.log('🔗 Connecting to Arijeem Insight 360 Database...');

class CEODatabase {
    constructor() {
        this.supabase = null;
        this.isConnected = false;
        this.lastConnectionTest = null;
        this.lastConnectionError = null;
        this.localUsers = [];
        this.syncData = {
            sales: [],
            products: [],
            users: [],
            debts: [],
            customers: [],
            stockHistory: [],
            salesAnalysis: {}
        };
        this.init();
    }
    
    async init() {
        try {
            console.log('🔄 Initializing connection to main system...');
            
            // Connect to SAME Supabase as main system
            this.supabase = supabase.createClient(
                CEO_CONFIG.SUPABASE_URL,
                CEO_CONFIG.SUPABASE_KEY,
                {
                    auth: { persistSession: true },
                    db: { schema: 'public' }
                }
            );
            
            // Test connection
            await this.testConnection();
            
            // Load local users if any
            this.loadLocalUsers();
            
            console.log('✅ Database initialization complete');
            
        } catch (error) {
            console.error('❌ Init error:', error);
            this.lastConnectionError = error.message;
        }
    }
    
    async testConnection() {
        try {
            console.log('🔌 Testing connection to main database...');
            
            // Try to query a simple table to test connection
            const { data, error } = await this.supabase
                .from('products')
                .select('*')
                .limit(1);
            
            if (error) {
                console.warn('⚠️ Connection issue:', error.message);
                this.isConnected = false;
                this.lastConnectionError = error.message;
                return false;
            }
            
            this.isConnected = true;
            this.lastConnectionTest = new Date().toISOString();
            this.lastConnectionError = null;
            console.log('✅ Connected to main system database');
            return true;
            
        } catch (error) {
            console.error('Connection test failed:', error);
            this.isConnected = false;
            this.lastConnectionError = error.message;
            return false;
        }
    }
    
    loadLocalUsers() {
        try {
            const stored = localStorage.getItem('ceo_users');
            this.localUsers = stored ? JSON.parse(stored) : [];
            console.log(`📁 Loaded ${this.localUsers.length} local users`);
        } catch (error) {
            console.error('Error loading local users:', error);
            this.localUsers = [];
        }
    }
    
    // CREATE CEO ACCOUNT (Stores locally AND syncs immediately)
    async createCEOAccount(ceoData) {
        try {
            console.log('👑 Creating CEO account...');
            
            // First check if email exists locally
            const localExists = this.localUsers.find(u => u.email === ceoData.email);
            if (localExists) {
                return {
                    success: false,
                    message: 'Account already exists. Please login.',
                    code: 'EXISTS'
                };
            }
            
            // Create user object
            const newUser = {
                id: 'temp_' + Date.now(),
                email: ceoData.email,
                name: ceoData.name,
                phone: ceoData.phone || '',
                role: 'CEO',
                password_hash: btoa(ceoData.password),
                created_at: new Date().toISOString(),
                is_active: true,
                is_local: true, // Mark as local until synced
                needs_sync: true // Flag to sync with main DB
            };
            
            // Save locally first
            this.localUsers.push(newUser);
            localStorage.setItem('ceo_users', JSON.stringify(this.localUsers));
            localStorage.setItem('ceo_last_user', ceoData.email);
            
            console.log('✅ Account saved locally:', newUser.email);
            
            // Try to sync with main database IMMEDIATELY
            console.log('🔄 Attempting to sync to main database...');
            await this.syncUserToMainDB(newUser);
            
            return {
                success: true,
                user: newUser,
                message: 'Account created successfully!'
            };
            
        } catch (error) {
            console.error('Account creation error:', error);
            return {
                success: false,
                message: 'Failed to create account. Please try again.'
            };
        }
    }
    
    // Try to sync user to main database
    async syncUserToMainDB(user) {
        try {
            if (!this.isConnected) {
                console.log('⚠️ Cannot sync: No database connection');
                await this.testConnection(); // Try to reconnect
                
                if (!this.isConnected) {
                    console.log('⚠️ Still not connected. Will retry later.');
                    return;
                }
            }
            
            console.log('🔄 Syncing user to main database:', user.email);
            
            // Prepare user data for main database
            const dbUser = {
                email: user.email,
                name: user.name,
                phone: user.phone,
                role: 'CEO',
                password_hash: user.password_hash,
                is_active: true,
                created_at: user.created_at
            };
            
            // Check if user already exists in main DB
            const { data: existing, error: checkError } = await this.supabase
                .from('users')
                .select('id')
                .eq('email', user.email)
                .maybeSingle();
            
            if (checkError) {
                console.warn('Check existing user error:', checkError.message);
            }
            
            let syncResult;
            if (existing) {
                console.log('User already exists in main DB, updating...');
                const { data, error } = await this.supabase
                    .from('users')
                    .update(dbUser)
                    .eq('email', user.email);
                
                syncResult = { data, error };
            } else {
                console.log('Inserting new user to main DB...');
                const { data, error } = await this.supabase
                    .from('users')
                    .insert([dbUser]);
                
                syncResult = { data, error };
            }
            
            if (syncResult.error) {
                console.error('❌ Sync failed:', syncResult.error.message);
                
                // Update local user to mark as needs sync
                const index = this.localUsers.findIndex(u => u.email === user.email);
                if (index !== -1) {
                    this.localUsers[index].needs_sync = true;
                    this.localUsers[index].sync_error = syncResult.error.message;
                    localStorage.setItem('ceo_users', JSON.stringify(this.localUsers));
                }
                
                return false;
            }
            
            // Update local user to mark as synced
            const index = this.localUsers.findIndex(u => u.email === user.email);
            if (index !== -1) {
                this.localUsers[index].is_local = false;
                this.localUsers[index].needs_sync = false;
                this.localUsers[index].sync_error = null;
                this.localUsers[index].synced_at = new Date().toISOString();
                localStorage.setItem('ceo_users', JSON.stringify(this.localUsers));
            }
            
            console.log('✅ User synced to main database');
            return true;
            
        } catch (error) {
            console.error('❌ User sync error:', error.message);
            
            // Mark as needing sync
            const index = this.localUsers.findIndex(u => u.email === user.email);
            if (index !== -1) {
                this.localUsers[index].needs_sync = true;
                this.localUsers[index].sync_error = error.message;
                localStorage.setItem('ceo_users', JSON.stringify(this.localUsers));
            }
            
            return false;
        }
    }
    
    // LOGIN - Check both local and main database
    async loginCEO(email, password) {
        try {
            console.log(`🔐 Login attempt: ${email}`);
            
            const encodedPassword = btoa(password);
            
            // First check local users
            const localUser = this.localUsers.find(u => 
                u.email === email && u.password_hash === encodedPassword
            );
            
            if (localUser) {
                console.log('✅ Local login successful');
                return {
                    success: true,
                    user: {
                        id: localUser.id,
                        name: localUser.name,
                        email: localUser.email,
                        phone: localUser.phone,
                        is_local: localUser.is_local || true,
                        needs_sync: localUser.needs_sync || false
                    }
                };
            }
            
            // If not found locally, check main database
            if (this.isConnected) {
                console.log('🔍 Checking main database for user...');
                
                // Try to find user in main DB
                const { data: dbUsers, error } = await this.supabase
                    .from('users')
                    .select('*')
                    .eq('email', email)
                    .eq('is_active', true);
                
                if (!error && dbUsers && dbUsers.length > 0) {
                    const dbUser = dbUsers[0];
                    
                    // Check password
                    if (dbUser.password_hash === encodedPassword) {
                        console.log('✅ Main DB login successful');
                        
                        // Save user locally for future logins
                        const localUser = {
                            id: dbUser.id,
                            email: dbUser.email,
                            name: dbUser.name,
                            phone: dbUser.phone || '',
                            role: dbUser.role,
                            password_hash: dbUser.password_hash,
                            created_at: dbUser.created_at,
                            is_local: false,
                            synced_at: new Date().toISOString()
                        };
                        
                        // Add to local storage if not already there
                        if (!this.localUsers.find(u => u.email === email)) {
                            this.localUsers.push(localUser);
                            localStorage.setItem('ceo_users', JSON.stringify(this.localUsers));
                        }
                        
                        return {
                            success: true,
                            user: {
                                id: dbUser.id,
                                name: dbUser.name,
                                email: dbUser.email,
                                phone: dbUser.phone,
                                is_local: false
                            }
                        };
                    } else {
                        console.log('❌ Password mismatch for main DB user');
                    }
                } else {
                    console.log('❌ User not found in main DB:', error?.message || 'No error');
                }
            } else {
                console.log('⚠️ Cannot check main DB: No connection');
            }
            
            return {
                success: false,
                message: 'Invalid email or password.'
            };
            
        } catch (error) {
            console.error('❌ Login error:', error);
            return {
                success: false,
                message: 'Login failed. Please try again.'
            };
        }
    }
    
    // SYNC ALL DATA FROM MAIN SYSTEM WITH DETAILS
    async syncFromMainSystem() {
        try {
            if (!this.isConnected) {
                console.log('⚠️ Cannot sync: No database connection');
                const reconnected = await this.testConnection();
                if (!reconnected) {
                    console.log('❌ Failed to reconnect');
                    return false;
                }
            }
            
            console.log('🔄 Syncing data from main system...');
            
            const today = new Date().toISOString().split('T')[0];
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            
            // Fetch all data in parallel
            const [sales, products, users, debts, customers, stockHistory] = await Promise.all([
                this.fetchDetailedSales(today),
                this.fetchProductsWithSales(),
                this.fetchStaff(),
                this.fetchDetailedDebts(),
                this.fetchTopCustomers(),
                this.fetchStockHistory(yesterday)
            ]);
            
            // Perform sales analysis
            const salesAnalysis = this.analyzeSales(sales);
            
            // Update sync data
            this.syncData = {
                sales: sales || [],
                products: products || [],
                users: users || [],
                debts: debts || [],
                customers: customers || [],
                stockHistory: stockHistory || [],
                salesAnalysis: salesAnalysis,
                last_sync: new Date().toISOString()
            };
            
            console.log(`✅ Sync complete: ${sales.length} sales, ${products.length} products`);
            return true;
            
        } catch (error) {
            console.error('❌ Sync error:', error);
            return false;
        }
    }
    
    async fetchDetailedSales(today) {
        try {
            const { data, error } = await this.supabase
                .from('sales')
                .select(`
                    *,
                    customer_name,
                    customer_phone,
                    payment_method,
                    products:product_id (
                        name,
                        category,
                        retail_price,
                        wholesale_price
                    )
                `)
                .gte('sale_date', today + 'T00:00:00')
                .lte('sale_date', today + 'T23:59:59')
                .order('sale_date', { ascending: false });
            
            if (error) throw error;
            
            // Enrich data with reasons and calculations
            const enrichedData = (data || []).map(sale => ({
                ...sale,
                reason: this.determineSaleReason(sale),
                profit_per_item: (sale.products?.retail_price || 0) - (sale.products?.wholesale_price || 0),
                total_profit: ((sale.products?.retail_price || 0) - (sale.products?.wholesale_price || 0)) * (sale.quantity || 0)
            }));
            
            return enrichedData;
            
        } catch (error) {
            console.error('❌ Fetch sales error:', error);
            return [];
        }
    }
    
    async fetchProductsWithSales() {
        try {
            const { data, error } = await this.supabase
                .from('products')
                .select(`
                    *,
                    sales:sales!product_id (
                        quantity,
                        total_price,
                        sale_date,
                        customer_name
                    )
                `)
                .order('current_qty');
            
            if (error) throw error;
            
            // Calculate sales statistics for each product
            const today = new Date().toISOString().split('T')[0];
            const enrichedProducts = (data || []).map(product => {
                const todaySales = (product.sales || []).filter(s => 
                    s.sale_date && s.sale_date.startsWith(today)
                );
                const totalSoldToday = todaySales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
                const revenueToday = todaySales.reduce((sum, sale) => sum + (sale.total_price || 0), 0);
                
                return {
                    ...product,
                    today_sales: todaySales,
                    sold_today: totalSoldToday,
                    revenue_today: revenueToday,
                    stock_value: (product.current_qty || 0) * (product.retail_price || 0),
                    needs_restock: (product.current_qty || 0) <= (product.min_qty || CEO_CONFIG.STOCK_WARNING)
                };
            });
            
            return enrichedProducts;
            
        } catch (error) {
            console.error('❌ Fetch products error:', error);
            return [];
        }
    }
    
    async fetchStockHistory(sinceDate) {
        try {
            const { data, error } = await this.supabase
                .from('stock_movements')
                .select(`
                    *,
                    products:product_id (
                        name
                    )
                `)
                .gte('created_at', sinceDate)
                .order('created_at', { ascending: false })
                .limit(20);
            
            if (error) throw error;
            return data || [];
            
        } catch (error) {
            console.error('❌ Fetch stock history error:', error);
            return [];
        }
    }
    
    async fetchTopCustomers() {
        try {
            const { data, error } = await this.supabase
                .from('sales')
                .select(`
                    customer_name,
                    customer_phone,
                    total_price,
                    sale_date
                `)
                .order('sale_date', { ascending: false })
                .limit(50);
            
            if (error) throw error;
            
            // Group by customer and calculate metrics
            const customerMap = new Map();
            
            (data || []).forEach(sale => {
                const customerName = sale.customer_name || 'Walk-in Customer';
                if (!customerMap.has(customerName)) {
                    customerMap.set(customerName, {
                        name: customerName,
                        phone: sale.customer_phone || 'N/A',
                        total_spent: 0,
                        purchase_count: 0,
                        last_purchase: sale.sale_date,
                        purchases: []
                    });
                }
                
                const customer = customerMap.get(customerName);
                customer.total_spent += sale.total_price || 0;
                customer.purchase_count++;
                customer.purchases.push({
                    amount: sale.total_price,
                    date: sale.sale_date
                });
                
                // Update last purchase if this is more recent
                if (new Date(sale.sale_date) > new Date(customer.last_purchase)) {
                    customer.last_purchase = sale.sale_date;
                }
            });
            
            // Convert to array and sort by total spent
            const customers = Array.from(customerMap.values())
                .map(c => ({
                    ...c,
                    avg_purchase: c.total_spent / c.purchase_count
                }))
                .sort((a, b) => b.total_spent - a.total_spent)
                .slice(0, 10);
            
            return customers;
            
        } catch (error) {
            console.error('❌ Fetch customers error:', error);
            return [];
        }
    }
    
    async fetchDetailedDebts() {
        try {
            const { data, error } = await this.supabase
                .from('sales')
                .select(`
                    *,
                    customer_name,
                    customer_phone,
                    products:product_id (
                        name
                    )
                `)
                .or('payment_status.eq.owing,payment_status.eq.partial')
                .order('sale_date', { ascending: false })
                .limit(20);
            
            if (error) throw error;
            
            // Enrich debt data
            const enrichedDebts = (data || []).map(debt => {
                const saleDate = new Date(debt.sale_date);
                const daysOwing = Math.floor((new Date() - saleDate) / (1000 * 60 * 60 * 24));
                
                return {
                    ...debt,
                    days_owing: daysOwing,
                    interest_accrued: daysOwing > 30 ? (debt.amount_owing || 0) * 0.01 * Math.floor(daysOwing / 30) : 0,
                    total_owing: (debt.amount_owing || 0) + (daysOwing > 30 ? (debt.amount_owing || 0) * 0.01 * Math.floor(daysOwing / 30) : 0)
                };
            });
            
            return enrichedDebts;
            
        } catch (error) {
            console.error('❌ Fetch debts error:', error);
            return [];
        }
    }
    
    async fetchStaff() {
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select(`
                    id,
                    name,
                    email,
                    role,
                    last_login,
                    is_active
                `)
                .eq('is_active', true)
                .neq('role', 'CEO')
                .order('name');
            
            if (error) throw error;
            return data || [];
            
        } catch (error) {
            console.error('❌ Fetch staff error:', error);
            return [];
        }
    }
    
    determineSaleReason(sale) {
        // Analyze sale data to determine reason
        const hour = new Date(sale.sale_date).getHours();
        const day = new Date(sale.sale_date).getDay();
        const quantity = sale.quantity || 0;
        const amount = sale.total_price || 0;
        
        if (hour >= 17 && hour <= 20) return "Evening Rush";
        if (hour >= 7 && hour <= 10) return "Morning Rush";
        if (day === 5 || day === 6) return "Weekend Sale";
        if (quantity > 10) return "Bulk Purchase";
        if (amount > 50000) return "High-Value Sale";
        if (sale.payment_method === 'credit') return "Credit Sale";
        if (sale.customer_name && sale.customer_name !== 'Walk-in') return "Regular Customer";
        
        return "Walk-in Sale";
    }
    
    analyzeSales(sales) {
        const hourlyData = {};
        const paymentMethods = {};
        let totalSales = 0;
        let totalProfit = 0;
        
        sales.forEach(sale => {
            const hour = new Date(sale.sale_date).getHours();
            hourlyData[hour] = (hourlyData[hour] || 0) + (sale.total_price || 0);
            
            const method = sale.payment_method || 'cash';
            paymentMethods[method] = (paymentMethods[method] || 0) + (sale.total_price || 0);
            
            totalSales += sale.total_price || 0;
            totalProfit += sale.total_profit || 0;
        });
        
        const peakHour = Object.entries(hourlyData)
            .sort(([,a], [,b]) => b - a)[0] || ['N/A', 0];
        
        const topPaymentMethod = Object.entries(paymentMethods)
            .sort(([,a], [,b]) => b - a)[0] || ['N/A', 0];
        
        const reasons = sales.reduce((acc, sale) => {
            acc[sale.reason] = (acc[sale.reason] || 0) + 1;
            return acc;
        }, {});
        
        const topReason = Object.entries(reasons)
            .sort(([,a], [,b]) => b - a)[0] || ['N/A', 0];
        
        return {
            hourlyData,
            paymentMethods,
            peakHour: { hour: peakHour[0], amount: peakHour[1] },
            topPaymentMethod: { method: topPaymentMethod[0], amount: topPaymentMethod[1] },
            topReason: { reason: topReason[0], count: topReason[1] },
            averageSale: sales.length > 0 ? totalSales / sales.length : 0,
            totalSales,
            totalProfit,
            profitMargin: totalSales > 0 ? (totalProfit / totalSales * 100).toFixed(2) : 0,
            transactionCount: sales.length
        };
    }
    
    // GET BUSINESS DATA WITH ENRICHED INFORMATION
    async getBusinessData() {
        try {
            console.log('📊 Getting business data...');
            
            // Always try to sync first
            await this.syncFromMainSystem();
            
            const { sales, products, users, debts, customers, stockHistory, salesAnalysis } = this.syncData;
            
            // Calculate totals and metrics
            const totalSales = sales.reduce((sum, s) => sum + (s.total_price || 0), 0);
            const productsSold = sales.reduce((sum, s) => sum + (s.quantity || 0), 0);
            const totalDebt = debts.reduce((sum, d) => sum + (d.total_owing || d.amount_owing || 0), 0);
            const totalProfit = sales.reduce((sum, s) => sum + (s.total_profit || 0), 0);
            
            // Get top performing products
            const topProducts = this.getTopProducts(products);
            
            // Stock analysis
            const stock = this.analyzeStock(products);
            
            return {
                sales,
                products,
                users,
                debts,
                customers,
                stockHistory,
                salesAnalysis,
                summary: {
                    totalSales,
                    productsSold,
                    staffCount: users.length,
                    totalDebt,
                    totalProfit,
                    profitMargin: totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : 0,
                    stockStatus: stock.status,
                    lastSync: new Date().toISOString(),
                    activeCustomers: customers.length,
                    transactionCount: sales.length
                },
                stock,
                topProducts,
                isConnected: this.isConnected,
                lastConnectionError: this.lastConnectionError
            };
            
        } catch (error) {
            console.error('❌ Get business data error:', error);
            return this.getSampleData();
        }
    }
    
    getTopProducts(products) {
        return products
            .map(p => ({
                ...p,
                sales_performance: p.sold_today || 0,
                stock_value: (p.current_qty || 0) * (p.retail_price || 0),
                turnover_rate: p.sold_today > 0 ? 
                    ((p.sold_today / (p.current_qty || 1)) * 100).toFixed(1) : 0
            }))
            .sort((a, b) => b.sales_performance - a.sales_performance)
            .slice(0, CEO_CONFIG.TOP_PRODUCTS_LIMIT);
    }
    
    analyzeStock(products) {
        const good = [], warning = [], critical = [];
        let totalStockValue = 0;
        
        products.forEach(p => {
            const qty = p.current_qty || 0;
            const value = qty * (p.retail_price || 0);
            totalStockValue += value;
            
            const stockItem = {
                ...p,
                stock_value: value,
                days_supply: p.sold_today > 0 ? Math.floor(qty / (p.sold_today || 1)) : 999,
                reorder_needed: qty <= (p.min_qty || CEO_CONFIG.STOCK_WARNING)
            };
            
            if (qty <= CEO_CONFIG.STOCK_CRITICAL) {
                critical.push(stockItem);
            } else if (qty <= CEO_CONFIG.STOCK_WARNING) {
                warning.push(stockItem);
            } else {
                good.push(stockItem);
            }
        });
        
        const status = critical.length > 0 ? 'critical' : 
                      warning.length > 0 ? 'warning' : 'good';
        
        return { good, warning, critical, status, totalStockValue };
    }
    
    getSampleData() {
        console.log('📊 Using sample data (no connection)');
        return {
            sales: [],
            products: [],
            users: [],
            debts: [],
            customers: [],
            stockHistory: [],
            salesAnalysis: {
                totalSales: 0,
                totalProfit: 0,
                averageSale: 0,
                peakHour: { hour: 'N/A', amount: 0 },
                topReason: { reason: 'N/A', count: 0 }
            },
            summary: {
                totalSales: 0,
                productsSold: 0,
                staffCount: 0,
                totalDebt: 0,
                totalProfit: 0,
                profitMargin: 0,
                stockStatus: 'unknown',
                lastSync: null,
                activeCustomers: 0,
                transactionCount: 0
            },
            stock: { good: [], warning: [], critical: [], status: 'unknown', totalStockValue: 0 },
            topProducts: [],
            isConnected: false,
            lastConnectionError: this.lastConnectionError
        };
    }
    
    // Check connection status
    async checkHealth() {
        return {
            connected: this.isConnected,
            lastConnectionTest: this.lastConnectionTest,
            lastConnectionError: this.lastConnectionError,
            localUsers: this.localUsers.length,
            localUserEmails: this.localUsers.map(u => ({ 
                email: u.email, 
                is_local: u.is_local,
                needs_sync: u.needs_sync 
            })),
            syncData: {
                sales: this.syncData.sales.length,
                products: this.syncData.products.length,
                customers: this.syncData.customers.length,
                last_sync: this.syncData.last_sync
            },
            timestamp: new Date().toISOString()
        };
    }
    
    // Retry syncing all local users that need sync
    async retryFailedSyncs() {
        try {
            const usersToSync = this.localUsers.filter(u => u.needs_sync);
            console.log(`🔄 Retrying sync for ${usersToSync.length} users...`);
            
            for (const user of usersToSync) {
                await this.syncUserToMainDB(user);
                await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
            }
            
            console.log('✅ Sync retry complete');
            return true;
        } catch (error) {
            console.error('❌ Sync retry error:', error);
            return false;
        }
    }
}

// Initialize database
window.ceoDB = new CEODatabase();

// Debug function
window.debugDatabase = async function() {
    console.log('=== DATABASE DEBUG ===');
    console.log('ceoDB.isConnected:', window.ceoDB?.isConnected);
    console.log('ceoDB.lastConnectionTest:', window.ceoDB?.lastConnectionTest);
    console.log('ceoDB.lastConnectionError:', window.ceoDB?.lastConnectionError);
    console.log('Local users:', window.ceoDB?.localUsers);
    console.log('CEO_CONFIG.SUPABASE_URL:', window.CEO_CONFIG?.SUPABASE_URL);
    console.log('CEO_CONFIG exists:', !!window.CEO_CONFIG);
    console.log('Supabase loaded:', typeof supabase !== 'undefined');
    
    // Test connection manually
    try {
        console.log('🔌 Testing connection now...');
        const health = await window.ceoDB?.checkHealth();
        console.log('Health check:', health);
    } catch (e) {
        console.log('Health check error:', e.message);
    }
    
    // Check browser storage
    console.log('LocalStorage ceo_users:', localStorage.getItem('ceo_users'));
    console.log('LocalStorage ceo_last_user:', localStorage.getItem('ceo_last_user'));
    console.log('LocalStorage ceo_user:', localStorage.getItem('ceo_user'));
    console.log('LocalStorage ceo_email:', localStorage.getItem('ceo_email'));
};
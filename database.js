// CEO DASHBOARD - DATABASE CONNECTION
console.log('🔗 Connecting to Arijeem Insight 360...');

class CEODatabase {
    constructor() {
        this.supabase = null;
        this.isConnected = false;
        this.lastConnectionTest = null;
        this.localUsers = [];
        this.syncData = {
            sales: [],
            products: [],
            users: [],
            debts: [],
            customers: [],
            stockHistory: [],
            salesAnalysis: {},
            lastUpdate: null
        };
        this.init();
    }
    
    async init() {
        try {
            console.log('🔄 Initializing connection to Arijeem Insight 360...');
            
            // Create Supabase client
            this.supabase = supabase.createClient(
                CEO_CONFIG.SUPABASE_URL,
                CEO_CONFIG.SUPABASE_KEY
            );
            
            // Test connection
            await this.testConnection();
            
            // Load local users if any
            this.loadLocalUsers();
            
            console.log('✅ Database initialization complete');
            
        } catch (error) {
            console.error('❌ Init error:', error);
            this.isConnected = false;
        }
    }
    
    async testConnection() {
        try {
            console.log('🔌 Testing database connection...');
            
            // Try to get server timestamp
            const { data, error } = await this.supabase.rpc('get_server_timestamp');
            
            if (error) {
                // Try alternative method
                const { data: testData, error: testError } = await this.supabase
                    .from('products')
                    .select('id')
                    .limit(1);
                    
                if (testError) {
                    console.error('❌ Connection failed:', testError.message);
                    this.isConnected = false;
                } else {
                    console.log('✅ Connected successfully');
                    this.isConnected = true;
                    this.lastConnectionTest = new Date().toISOString();
                }
            } else {
                console.log('✅ Connected to server');
                this.isConnected = true;
                this.lastConnectionTest = new Date().toISOString();
            }
            
        } catch (error) {
            console.error('❌ Connection test failed:', error);
            this.isConnected = false;
        }
    }
    
    async ensureConnection() {
        if (!this.isConnected) {
            await this.testConnection();
        }
        return this.isConnected;
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
    
    // CREATE CEO ACCOUNT
    async createCEOAccount(ceoData) {
        try {
            console.log('👑 Creating CEO account...');
            
            // Check if email exists locally
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
                id: Date.now().toString(),
                email: ceoData.email,
                name: ceoData.name,
                phone: ceoData.phone || '',
                role: 'CEO',
                password_hash: this.hashPassword(ceoData.password),
                created_at: new Date().toISOString(),
                is_active: true,
                is_local: true
            };
            
            // Save locally
            this.localUsers.push(newUser);
            localStorage.setItem('ceo_users', JSON.stringify(this.localUsers));
            localStorage.setItem('ceo_last_user', ceoData.email);
            
            console.log('✅ Account saved locally:', newUser.email);
            
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
    
    hashPassword(password) {
        // Simple hash for demo - in production use proper hashing
        return btoa(password + 'arijeem_salt_2024');
    }
    
    // SYNC FROM MAIN SYSTEM - SIMPLIFIED VERSION
    async syncFromMainSystem() {
        try {
            console.log('🔄 Syncing data from main system...');
            
            const connected = await this.ensureConnection();
            if (!connected) {
                console.log('⚠️ Cannot sync: No database connection');
                return false;
            }
            
            const today = new Date();
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
            const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();
            
            // Get data
            const sales = await this.fetchSales(todayStart, todayEnd);
            const products = await this.fetchProducts();
            const debts = await this.fetchDebts();
            const customers = await this.fetchCustomers();
            
            // Analyze sales
            const salesAnalysis = this.analyzeSales(sales);
            
            // Update sync data
            this.syncData = {
                sales: sales,
                products: products,
                users: [], // Simplified for now
                debts: debts,
                customers: customers,
                salesAnalysis: salesAnalysis,
                lastUpdate: new Date().toISOString()
            };
            
            console.log(`✅ Sync complete: ${sales.length} sales, ${products.length} products`);
            
            // Save to localStorage
            this.saveToLocalStorage();
            
            return true;
            
        } catch (error) {
            console.error('❌ Sync error:', error);
            return false;
        }
    }
    
    // FETCH SALES - Simplified for your system
    async fetchSales(todayStart, todayEnd) {
        try {
            console.log('📈 Fetching sales...');
            
            // Try multiple table names
            const tables = ['sales', 'transactions', 'orders'];
            
            for (const table of tables) {
                try {
                    const { data, error } = await this.supabase
                        .from(table)
                        .select('*')
                        .gte('created_at', todayStart)
                        .lte('created_at', todayEnd)
                        .order('created_at', { ascending: false })
                        .limit(50);
                    
                    if (!error && data && data.length > 0) {
                        console.log(`✅ Found ${data.length} sales in ${table}`);
                        
                        // Process the data
                        return data.map(sale => ({
                            id: sale.id,
                            product_name: sale.product_name || sale.product || 'Product',
                            customer_name: sale.customer_name || sale.customer || 'Customer',
                            quantity: sale.quantity || 1,
                            total_price: sale.total_price || sale.amount || sale.total || 0,
                            unit_price: sale.unit_price || sale.price || 0,
                            payment_method: sale.payment_method || sale.payment_type || 'cash',
                            sale_date: sale.sale_date || sale.created_at || sale.date,
                            created_at: sale.created_at,
                            time: new Date(sale.created_at || sale.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                            reason: 'Sale'
                        }));
                    }
                } catch (e) {
                    continue;
                }
            }
            
            console.log('⚠️ No sales found in any table');
            return [];
            
        } catch (error) {
            console.error('❌ Fetch sales error:', error);
            return [];
        }
    }
    
    // FETCH PRODUCTS
    async fetchProducts() {
        try {
            console.log('📦 Fetching products...');
            
            const tables = ['products', 'inventory', 'items'];
            
            for (const table of tables) {
                try {
                    const { data, error } = await this.supabase
                        .from(table)
                        .select('*')
                        .limit(100);
                    
                    if (!error && data && data.length > 0) {
                        console.log(`✅ Found ${data.length} products in ${table}`);
                        return data;
                    }
                } catch (e) {
                    continue;
                }
            }
            
            console.log('⚠️ No products found');
            return [];
            
        } catch (error) {
            console.error('❌ Fetch products error:', error);
            return [];
        }
    }
    
    // FETCH DEBTS
    async fetchDebts() {
        try {
            console.log('💳 Fetching debts...');
            
            const tables = ['sales', 'transactions', 'debts', 'invoices'];
            
            for (const table of tables) {
                try {
                    const { data, error } = await this.supabase
                        .from(table)
                        .select('*')
                        .or('payment_status.eq.owing,payment_status.eq.partial,balance.gt.0')
                        .limit(20);
                    
                    if (!error && data && data.length > 0) {
                        console.log(`✅ Found ${data.length} debts in ${table}`);
                        return data.map(debt => ({
                            id: debt.id,
                            customer_name: debt.customer_name || debt.customer || 'Customer',
                            amount_owing: debt.amount_owing || debt.balance || debt.total_price,
                            days_owing: debt.days_owing || 0
                        }));
                    }
                } catch (e) {
                    continue;
                }
            }
            
            console.log('⚠️ No debts found');
            return [];
            
        } catch (error) {
            console.error('❌ Fetch debts error:', error);
            return [];
        }
    }
    
    // FETCH CUSTOMERS
    async fetchCustomers() {
        try {
            console.log('👥 Fetching customers...');
            
            // Get from sales table
            const { data: salesData, error } = await this.supabase
                .from('sales')
                .select('customer_name, customer_phone, total_price, created_at')
                .order('created_at', { ascending: false })
                .limit(50);
            
            if (error) {
                console.error('❌ Fetch customers error:', error);
                return [];
            }
            
            // Process customer data
            const customerMap = new Map();
            
            (salesData || []).forEach(sale => {
                const customerName = sale.customer_name || 'Walk-in Customer';
                if (!customerMap.has(customerName)) {
                    customerMap.set(customerName, {
                        name: customerName,
                        phone: sale.customer_phone || '',
                        total_spent: 0,
                        purchase_count: 0
                    });
                }
                
                const customer = customerMap.get(customerName);
                customer.total_spent += sale.total_price || 0;
                customer.purchase_count++;
            });
            
            const customers = Array.from(customerMap.values())
                .sort((a, b) => b.total_spent - a.total_spent)
                .slice(0, 10);
            
            console.log(`✅ Found ${customers.length} customers`);
            return customers;
            
        } catch (error) {
            console.error('❌ Fetch customers error:', error);
            return [];
        }
    }
    
    analyzeSales(sales) {
        if (!sales || sales.length === 0) {
            return {
                totalSales: 0,
                totalProfit: 0,
                averageSale: 0,
                transactionCount: 0
            };
        }
        
        const totalSales = sales.reduce((sum, sale) => sum + (sale.total_price || 0), 0);
        const totalProfit = sales.reduce((sum, sale) => sum + ((sale.total_price || 0) * 0.3), 0); // Assuming 30% profit
        
        return {
            totalSales,
            totalProfit,
            averageSale: totalSales / sales.length,
            transactionCount: sales.length,
            profitMargin: totalSales > 0 ? (totalProfit / totalSales * 100).toFixed(1) : 0
        };
    }
    
    // GET BUSINESS DATA
    async getBusinessData() {
        try {
            // Try to sync first
            await this.syncFromMainSystem();
            
            const { sales, products, debts, customers, salesAnalysis, lastUpdate } = this.syncData;
            
            // Calculate totals
            const totalSales = salesAnalysis.totalSales || 0;
            const productsSold = sales.reduce((sum, s) => sum + (s.quantity || 0), 0);
            const totalDebt = debts.reduce((sum, d) => sum + (d.amount_owing || 0), 0);
            const totalProfit = salesAnalysis.totalProfit || 0;
            
            // Analyze stock
            const stock = this.analyzeStock(products);
            
            // Get top products
            const topProducts = this.getTopProducts(products);
            
            return {
                sales,
                products,
                debts,
                customers,
                salesAnalysis,
                summary: {
                    totalSales,
                    productsSold,
                    staffCount: 0, // Simplified for now
                    totalDebt,
                    totalProfit,
                    profitMargin: salesAnalysis.profitMargin || 0,
                    stockStatus: stock.status,
                    lastUpdate,
                    transactionCount: sales.length
                },
                stock,
                topProducts,
                isConnected: this.isConnected,
                lastConnectionTest: this.lastConnectionTest
            };
            
        } catch (error) {
            console.error('❌ Get business data error:', error);
            return this.getFallbackData();
        }
    }
    
    analyzeStock(products) {
        const critical = [], warning = [], good = [];
        
        (products || []).forEach(p => {
            const qty = p.current_qty || p.quantity || 0;
            const stockItem = {
                name: p.name || p.product_name,
                current_qty: qty,
                status: qty <= CEO_CONFIG.STOCK_CRITICAL ? 'critical' : 
                        qty <= CEO_CONFIG.STOCK_WARNING ? 'warning' : 'good'
            };
            
            if (stockItem.status === 'critical') critical.push(stockItem);
            else if (stockItem.status === 'warning') warning.push(stockItem);
            else good.push(stockItem);
        });
        
        const status = critical.length > 0 ? 'critical' : 
                      warning.length > 0 ? 'warning' : 'good';
        
        return { critical, warning, good, status };
    }
    
    getTopProducts(products) {
        if (!products || products.length === 0) return [];
        
        return products
            .slice(0, CEO_CONFIG.TOP_PRODUCTS_LIMIT)
            .map(p => ({
                name: p.name || p.product_name,
                current_qty: p.current_qty || p.quantity || 0,
                retail_price: p.retail_price || p.price || 0,
                sold_today: 0 // Simplified for now
            }));
    }
    
    getFallbackData() {
        return {
            sales: [],
            products: [],
            debts: [],
            customers: [],
            salesAnalysis: {
                totalSales: 0,
                totalProfit: 0,
                averageSale: 0,
                transactionCount: 0,
                profitMargin: 0
            },
            summary: {
                totalSales: 0,
                productsSold: 0,
                staffCount: 0,
                totalDebt: 0,
                totalProfit: 0,
                profitMargin: 0,
                stockStatus: 'unknown',
                lastUpdate: null,
                transactionCount: 0
            },
            stock: { critical: [], warning: [], good: [], status: 'unknown' },
            topProducts: [],
            isConnected: false,
            lastConnectionTest: null
        };
    }
    
    saveToLocalStorage() {
        try {
            const dataToSave = {
                syncData: this.syncData,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('ceo_cached_data', JSON.stringify(dataToSave));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }
    
    // LOGIN
    async loginCEO(email, password) {
        try {
            console.log(`🔐 Login attempt: ${email}`);
            
            const hashedPassword = this.hashPassword(password);
            
            // Check local users
            const localUser = this.localUsers.find(u => 
                u.email === email && u.password_hash === hashedPassword
            );
            
            if (localUser) {
                console.log('✅ Local login successful');
                return {
                    success: true,
                    user: {
                        id: localUser.id,
                        name: localUser.name,
                        email: localUser.email,
                        phone: localUser.phone
                    }
                };
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
    
    // FORCE REFRESH
    async forceRefresh() {
        return await this.syncFromMainSystem();
    }
}

// Initialize database
window.ceoDB = new CEODatabase();

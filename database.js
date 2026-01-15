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
            console.log('🔄 Initializing connection...');
            
            this.supabase = supabase.createClient(
                CEO_CONFIG.SUPABASE_URL,
                CEO_CONFIG.SUPABASE_KEY
            );
            
            await this.testConnection();
            this.loadLocalUsers();
            
            console.log('✅ Database initialized');
            
        } catch (error) {
            console.error('❌ Init error:', error);
            this.isConnected = false;
        }
    }
    
    async testConnection() {
        try {
            console.log('🔌 Testing connection...');
            
            const { error } = await this.supabase
                .from('products')
                .select('id')
                .limit(1);
            
            if (error) {
                console.log('⚠️ Connection test failed:', error.message);
                this.isConnected = false;
                return false;
            } else {
                console.log('✅ Connected to database');
                this.isConnected = true;
                this.lastConnectionTest = new Date().toISOString();
                return true;
            }
            
        } catch (error) {
            console.error('Connection test failed:', error);
            this.isConnected = false;
            return false;
        }
    }
    
    async ensureConnection() {
        if (!this.isConnected) {
            return await this.testConnection();
        }
        return true;
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
            
            const localExists = this.localUsers.find(u => u.email === ceoData.email);
            if (localExists) {
                return {
                    success: false,
                    message: 'Account already exists. Please login.',
                    code: 'EXISTS'
                };
            }
            
            const newUser = {
                id: 'ceo_' + Date.now(),
                email: ceoData.email,
                name: ceoData.name,
                phone: ceoData.phone || '',
                role: 'CEO',
                password_hash: btoa(ceoData.password),
                created_at: new Date().toISOString(),
                is_active: true,
                is_local: true
            };
            
            this.localUsers.push(newUser);
            localStorage.setItem('ceo_users', JSON.stringify(this.localUsers));
            localStorage.setItem('ceo_last_user', ceoData.email);
            
            console.log('✅ Account saved locally');
            
            return {
                success: true,
                user: newUser,
                message: 'Account created!'
            };
            
        } catch (error) {
            console.error('Account creation error:', error);
            return {
                success: false,
                message: 'Failed to create account.'
            };
        }
    }
    
    // SYNC FROM MAIN SYSTEM - UPDATED FOR YOUR TABLES
    async syncFromMainSystem() {
        try {
            console.log('🔄 Syncing data...');
            
            const connected = await this.ensureConnection();
            if (!connected) {
                console.log('⚠️ No connection');
                return false;
            }
            
            const today = new Date();
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
            
            // Fetch data from YOUR tables
            const sales = await this.fetchSales(todayStart);
            const products = await this.fetchProducts();
            const users = await this.fetchUsers();
            
            // Analyze
            const salesAnalysis = this.analyzeSales(sales);
            
            // Update sync data
            this.syncData = {
                sales: sales || [],
                products: products || [],
                users: users || [],
                debts: [], // Your system might not have debts table
                customers: [], // Will extract from sales
                salesAnalysis: salesAnalysis,
                lastUpdate: new Date().toISOString()
            };
            
            console.log(`✅ Sync complete`);
            
            this.saveToLocalStorage();
            return true;
            
        } catch (error) {
            console.error('❌ Sync error:', error);
            return false;
        }
    }
    
    // FETCH SALES - ADAPTED FOR YOUR SYSTEM
    async fetchSales(todayStart) {
        try {
            console.log('📈 Fetching sales...');
            
            const { data, error } = await this.supabase
                .from('sales')
                .select('*')
                .gte('created_at', todayStart)
                .order('created_at', { ascending: false });
            
            if (error) {
                console.log('❌ Sales fetch error:', error.message);
                return [];
            }
            
            if (!data || data.length === 0) {
                console.log('ℹ️ No sales today');
                return [];
            }
            
            // Process sales based on YOUR column names
            const processedSales = data.map(sale => {
                // Try different column name patterns
                const productName = sale.product_name || sale.product || 'Product';
                const customerName = sale.customer_name || sale.customer || sale.customerName || 'Customer';
                const quantity = sale.quantity || sale.qty || 1;
                const totalPrice = sale.total_price || sale.total || sale.amount || 0;
                const paymentMethod = sale.payment_method || sale.payment || 'cash';
                const saleDate = sale.sale_date || sale.created_at;
                
                return {
                    id: sale.id,
                    product_name: productName,
                    customer_name: customerName,
                    quantity: quantity,
                    total_price: totalPrice,
                    unit_price: sale.unit_price || (totalPrice / quantity),
                    payment_method: paymentMethod,
                    sale_date: saleDate,
                    created_at: sale.created_at,
                    time: new Date(sale.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                    reason: 'Sale'
                };
            });
            
            console.log(`✅ Found ${processedSales.length} sales`);
            return processedSales;
            
        } catch (error) {
            console.error('Fetch sales error:', error);
            return [];
        }
    }
    
    // FETCH PRODUCTS - ADAPTED FOR YOUR SYSTEM
    async fetchProducts() {
        try {
            console.log('📦 Fetching products...');
            
            const { data, error } = await this.supabase
                .from('products')
                .select('*');
            
            if (error) {
                console.log('❌ Products fetch error:', error.message);
                return [];
            }
            
            if (!data || data.length === 0) {
                console.log('ℹ️ No products found');
                return [];
            }
            
            console.log(`✅ Found ${data.length} products`);
            return data;
            
        } catch (error) {
            console.error('Fetch products error:', error);
            return [];
        }
    }
    
    // FETCH USERS/STAFF
    async fetchUsers() {
        try {
            console.log('👥 Fetching users...');
            
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('is_active', true);
            
            if (error) {
                console.log('❌ Users fetch error:', error.message);
                return [];
            }
            
            if (!data || data.length === 0) {
                console.log('ℹ️ No users found');
                return [];
            }
            
            console.log(`✅ Found ${data.length} users`);
            return data;
            
        } catch (error) {
            console.error('Fetch users error:', error);
            return [];
        }
    }
    
    analyzeSales(sales) {
        if (!sales || sales.length === 0) {
            return {
                totalSales: 0,
                totalProfit: 0,
                averageSale: 0,
                transactionCount: 0,
                profitMargin: 0
            };
        }
        
        const totalSales = sales.reduce((sum, sale) => sum + (sale.total_price || 0), 0);
        const totalProfit = totalSales * 0.3;
        
        return {
            totalSales,
            totalProfit,
            averageSale: totalSales / sales.length,
            transactionCount: sales.length,
            profitMargin: totalSales > 0 ? (totalProfit / totalSales * 100).toFixed(1) : 0
        };
    }
    
    // GET BUSINESS DATA - SIMPLIFIED
    async getBusinessData() {
        try {
            console.log('📊 Getting business data...');
            
            const syncSuccess = await this.syncFromMainSystem();
            
            if (!syncSuccess) {
                console.log('⚠️ Sync failed, loading cached data');
                return this.loadCachedData();
            }
            
            const { sales, products, users, salesAnalysis, lastUpdate } = this.syncData;
            
            // Calculate totals
            const totalSales = salesAnalysis.totalSales || 0;
            const productsSold = sales.reduce((sum, s) => sum + (s.quantity || 0), 0);
            
            // Analyze stock
            const stock = this.analyzeStock(products);
            
            // Get top products
            const topProducts = this.getTopProducts(products);
            
            // Extract unique customers from sales
            const uniqueCustomers = [...new Set(sales.map(s => s.customer_name).filter(name => name))];
            
            console.log('✅ Business data loaded successfully');
            
            return {
                sales: sales || [],
                products: products || [],
                debts: [], // Empty for now
                customers: uniqueCustomers.map(name => ({ name: name, total_spent: 0 })), // Simple customer list
                salesAnalysis: salesAnalysis,
                summary: {
                    totalSales: totalSales,
                    productsSold: productsSold,
                    staffCount: users.length || 0,
                    totalDebt: 0, // Your system might not track debts
                    totalProfit: salesAnalysis.totalProfit || 0,
                    profitMargin: salesAnalysis.profitMargin || 0,
                    stockStatus: stock.status || 'unknown',
                    lastUpdate: lastUpdate,
                    transactionCount: sales.length || 0,
                    activeCustomers: uniqueCustomers.length || 0 // ADDED THIS
                },
                stock: stock,
                topProducts: topProducts || [],
                isConnected: this.isConnected
            };
            
        } catch (error) {
            console.error('❌ Get business data error:', error);
            return this.loadCachedData();
        }
    }
    
    analyzeStock(products) {
        if (!products || products.length === 0) {
            return {
                critical: [],
                warning: [],
                good: [],
                status: 'unknown'
            };
        }
        
        const critical = [];
        const warning = [];
        const good = [];
        
        products.forEach(p => {
            const qty = p.current_qty || p.quantity || 0;
            
            if (qty <= CEO_CONFIG.STOCK_CRITICAL) {
                critical.push(p);
            } else if (qty <= CEO_CONFIG.STOCK_WARNING) {
                warning.push(p);
            } else {
                good.push(p);
            }
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
                name: p.name,
                current_qty: p.current_qty || p.quantity || 0,
                retail_price: p.retail_price || p.price || 0
            }));
    }
    
    loadCachedData() {
        try {
            const cached = localStorage.getItem('ceo_cached_data');
            if (cached) {
                console.log('📂 Loaded cached data');
                return JSON.parse(cached);
            }
        } catch (error) {
            console.error('Error loading cached data:', error);
        }
        
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
                transactionCount: 0,
                activeCustomers: 0
            },
            stock: { critical: [], warning: [], good: [], status: 'unknown' },
            topProducts: [],
            isConnected: false
        };
    }
    
    saveToLocalStorage() {
        try {
            // Get current data
            const businessData = {
                sales: this.syncData.sales || [],
                products: this.syncData.products || [],
                salesAnalysis: this.syncData.salesAnalysis || {},
                summary: {
                    lastUpdate: this.syncData.lastUpdate,
                    transactionCount: this.syncData.sales?.length || 0
                },
                timestamp: new Date().toISOString()
            };
            
            localStorage.setItem('ceo_cached_data', JSON.stringify(businessData));
            console.log('💾 Saved to cache');
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }
    
    // LOGIN
    async loginCEO(email, password) {
        try {
            console.log(`🔐 Login attempt: ${email}`);
            
            const hashedPassword = btoa(password);
            const localUser = this.localUsers.find(u => u.email === email && u.password_hash === hashedPassword);
            
            if (localUser) {
                console.log('✅ Login successful');
                return {
                    success: true,
                    user: {
                        id: localUser.id,
                        name: localUser.name,
                        email: localUser.email
                    }
                };
            }
            
            return {
                success: false,
                message: 'Invalid email or password.'
            };
            
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                message: 'Login failed.'
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

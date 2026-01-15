// CEO DASHBOARD CONFIGURATION - ARijeem Insight 360
const CEO_CONFIG = {
    // DATABASE CONNECTION - Updated for your system
    SUPABASE_URL: 'https://twnbpdqssvzuvdlfzdum.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3bmJwZHFzc3Z6dXZkbGZ6ZHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNzQ0NzAsImV4cCI6MjA4Mzg1MDQ3MH0.XfPvPh4YZDES5gktKkj5KHtHmNTZmjye8LfDkBbpX-U',
    
    // SYSTEM SETTINGS
    COMPANY: 'Arijeem Enterprises',
    REPORT_TIME: '20:00',
    
    // STOCK ALERTS
    STOCK_WARNING: 20,
    STOCK_CRITICAL: 5,
    
    // PASSWORD REQUIREMENTS
    PASSWORD_MIN: 6,
    
    // SYNC SETTINGS
    SYNC_INTERVAL: 10000, // 10 seconds for real-time updates
    AUTO_REPORT_CHECK: 60000,
    
    // UI SETTINGS
    MESSAGE_DISPLAY_TIME: 4000,
    AUTO_LOGOUT_MINUTES: 60,
    
    // REPORT SETTINGS
    TOP_PRODUCTS_LIMIT: 10,
    COMPANY_ADDRESS: 'Lagos, Nigeria',
    COMPANY_PHONE: '+234 800 000 0000'
};

// Make globally available
window.CEO_CONFIG = CEO_CONFIG;

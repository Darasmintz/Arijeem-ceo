// CEO SIMPLE DASHBOARD CONFIGURATION
const CEO_CONFIG = {
    // DATABASE CONNECTION (Same as main system)
    SUPABASE_URL: 'https://twnbpdqssvzuvdlfzdum.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3bmJwZHFzc3Z6dXZkbGZ6ZHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNzQ0NzAsImV4cCI6MjA4Mzg1MDQ3MH0.XfPvPh4YZDES5gktKkj5KHtHmNTZmjye8LfDkBbpX-U',
    
    // SYSTEM SETTINGS
    COMPANY: 'Arijeem Enterprises',
    REPORT_TIME: '22:00', // 10:00 PM
    
    // STOCK ALERTS
    STOCK_WARNING: 20,
    STOCK_CRITICAL: 5,
    
    // PASSWORD REQUIREMENTS
    PASSWORD_MIN: 6,
    
    // SYNC SETTINGS
    SYNC_INTERVAL: 30000, // 30 seconds
    AUTO_REPORT_CHECK: 60000, // 1 minute
    
    // UI SETTINGS
    MESSAGE_DISPLAY_TIME: 4000,
    AUTO_LOGOUT_MINUTES: 60,
    
    // REPORT SETTINGS
    TOP_PRODUCTS_LIMIT: 10,
    PDF_REPORT: true,
    COMPANY_ADDRESS: 'Lagos, Nigeria',
    COMPANY_PHONE: '+234 904 589 0839'
};

// Make globally available
window.CEO_CONFIG = CEO_CONFIG;
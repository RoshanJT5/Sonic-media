/**
 * THE SONIC MEDIA — Central Supabase Credentials & Configuration
 * Single Source of Truth for Supabase Connection.
 * 
 * To switch to your live client Supabase account, simply update the
 * URL and ANON_KEY below. All website scripts, the Live CMS, and the
 * admin panel will instantly connect to the new project.
 */
window.SUPABASE_CONFIG = {
  URL: 'https://plytoawhcvzdjtrgtnrn.supabase.co',
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBseXRvYXdoY3Z6ZGp0cmd0bnJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NjkyNTYsImV4cCI6MjEwNzU0NTI1Nn0.AxpKzQf5LL-ePbmtsxELKQdip3bYp9hBp9xYugybelc'
};

// Global convenience aliases
window.SUPABASE_URL = window.SUPABASE_CONFIG.URL;
window.SUPABASE_ANON = window.SUPABASE_CONFIG.ANON_KEY;

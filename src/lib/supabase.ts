import { createClient } from '@supabase/supabase-js';


// Initialize database client
const supabaseUrl = 'https://jbriixqeliczaulyugoc.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImZkZWVlZmIxLWYyMjEtNDNjMS05MzQ4LWM1Yzk3OTU5NzlhZSJ9.eyJwcm9qZWN0SWQiOiJqYnJpaXhxZWxpY3phdWx5dWdvYyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzcwMTg0NzExLCJleHAiOjIwODU1NDQ3MTEsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.Ydn3BcLm97RvLJ4arbh2IeDCqRcHQDbB171CVaM5pBE';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };
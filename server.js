// This file uses modern ECMAScript Module (ESM) syntax to ensure compatibility with Node.js environments configured for type="module".

// --- ESM Syntax: Loading Dependencies ---
// This imports the 'dotenv/config' utility to load environment variables from a .env file (if running locally).
import 'dotenv/config'; 
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = process.env.PORT || 3000;

// =========================================================
// Middleware
// =========================================================
// Enable Cross-Origin Resource Sharing (CORS) for the frontend to access the API
app.use(cors()); 
// Middleware to parse incoming JSON request bodies
app.use(express.json()); 

// --- Supabase Configuration ---
const supabaseUrl = process.env.SUPABASE_URL;
// 🛑 CRITICAL FIX: The variable name is set to SUPABASE_SERVICE_ROLE to match 
// the existing environment variable name configured in Render.
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE; 

// Initialize Supabase client
if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("FATAL: Supabase environment variables not configured. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE.");
    // Exit the process if critical variables are missing to prevent runtime errors
    // or connecting to a default/wrong database.
    process.exit(1); 
}
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// --- API Endpoint: Check Payment Status ---
app.post('/api/check-payment', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required', isPaid: false });
    }

    try {
        // Look up the 'transactions' table for a record matching the email 
        // and having a 'paid' status.
        const { data, error } = await supabase
            .from('transactions')
            .select('status')
            .eq('user_email', email.toLowerCase())
            .eq('status', 'paid')
            .maybeSingle();

        if (error) {
            console.error('Supabase query error:', error);
            // Provide a generic 500 status to the client, but log the detail internally
            return res.status(500).json({ 
                error: 'Database error occurred during payment check.', 
                isPaid: false 
            });
        }

        // isPaid is true if data (the single record) is found, otherwise false
        const isPaid = !!data; 

        console.log(`Payment check performed for ${email}. Status: ${isPaid ? 'PAID' : 'NOT PAID'}`);

        return res.json({ 
            message: isPaid ? 'Payment confirmed.' : 'No active payment found.',
            isPaid: isPaid
        });

    } catch (e) {
        console.error('Unexpected server error during payment check:', e);
        return res.status(500).json({ 
            error: 'An unexpected internal server error occurred.', 
            isPaid: false 
        });
    }
});

// --- Simple Health Check Endpoint ---
// This route is essential for Render to confirm the service is running.
app.get('/', (req, res) => {
    res.send('Cover Letter Backend API is running successfully.');
});

// --- Start the Server ---
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

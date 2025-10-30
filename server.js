// --- ESM Syntax: Loading Dependencies ---
import 'dotenv/config'; // Loads .env file immediately using the ESM syntax
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = process.env.PORT || 3000;

// =========================================================
// 🛑 CORS FIX: Allow cross-origin requests
// =========================================================
app.use(cors()); 
app.use(express.json()); // Middleware to parse JSON bodies

// --- Supabase Configuration ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

// Initialize Supabase client
if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("FATAL: Supabase environment variables not configured.");
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
        // Look up the transaction table for the provided email 
        // and check if the status is 'paid'.
        const { data, error } = await supabase
            .from('transactions')
            .select('status')
            .eq('user_email', email.toLowerCase())
            .eq('status', 'paid')
            .maybeSingle();

        if (error) {
            console.error('Supabase query error:', error);
            return res.status(500).json({ 
                error: 'Database error occurred during payment check.', 
                isPaid: false 
            });
        }

        const isPaid = !!data; 

        if (isPaid) {
            console.log(`Access granted for email: ${email}`);
        } else {
            console.log(`Access denied for email: ${email}. No 'paid' transaction found.`);
        }

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
app.get('/', (req, res) => {
    res.send('Cover Letter Backend API is running.');
});

// --- Start the Server ---
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

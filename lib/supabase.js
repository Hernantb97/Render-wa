require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Aceptar ambos formatos de nombres de variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan las variables de entorno de Supabase');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase }; 
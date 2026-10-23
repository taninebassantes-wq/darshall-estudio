import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Archivo .env no encontrado.');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const getEnv = (key) => {
    const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim().replace(/^["']|["']$/g, '') : '';
  };

  const dbUrl = getEnv('DATABASE_URL');
  const supabaseUrl = getEnv('PUBLIC_SUPABASE_URL');
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  const sqlPath = path.resolve(__dirname, '../supabase/schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('📌 Verificando configuración de Supabase...');

  if (!dbUrl && (!supabaseUrl || supabaseUrl.includes('TU_PROYECTO'))) {
    console.log('\n⚠️ Faltan tus credenciales reales de Supabase en el archivo .env:');
    console.log('1. Abre tu proyecto en https://supabase.com/dashboard');
    console.log('2. Copia la URL del proyecto y las claves API (Anon & Service Role)');
    console.log('3. O copia la Connection String PostgreSQL en Project Settings -> Database');
    console.log('4. Pégalas en el archivo .env y vuelve a ejecutar este comando.\n');
    process.exit(0);
  }

  console.log('🔗 Conectando con Supabase para aplicar schema.sql...');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

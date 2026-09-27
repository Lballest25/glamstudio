// Committed template only. The real environment.ts / environment.prod.ts
// files are generated at build time by scripts/generate-env.mjs and are
// gitignored — never commit real Supabase credentials.
export const environment = {
  production: false,
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  supabaseAnonKey: 'YOUR_ANON_KEY',
};

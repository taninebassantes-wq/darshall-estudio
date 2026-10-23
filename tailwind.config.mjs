/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        studio: {
          50: '#FDF7F8',
          100: '#FCEEF1',
          200: '#F9D8DF',
          300: '#F4B7C4',
          400: '#EB8EA3',
          500: '#DE6483', // Rosa boutique principal
          600: '#C74768',
          700: '#A63450',
          800: '#8A2E44',
          900: '#752A3C',
        },
        beige: {
          50: '#FDFBF7',
          100: '#F9F5EC',
          200: '#F3EBD8',
          300: '#E9DEC2',
          400: '#DEC9A4',
          500: '#CDB184',
        },
        gold: {
          DEFAULT: '#D4AF37',
          light: '#F3E5AB',
          dark: '#B08D26',
          gradient: 'linear-gradient(135deg, #D4AF37 0%, #F5DEB3 50%, #B08D26 100%)'
        },
        slate: {
          850: '#172033',
          950: '#0B0F19',
        }
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft-pink': '0 10px 25px -5px rgba(222, 100, 131, 0.15), 0 8px 10px -6px rgba(222, 100, 131, 0.1)',
        'gold-glow': '0 0 15px rgba(212, 175, 55, 0.3)',
      }
    },
  },
  plugins: [],
};

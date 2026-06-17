import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg0: '#0F1623', bg1: '#151E2D', bg2: '#1C2A3E', bg3: '#243044',
        amber: { DEFAULT: '#F59E0B', dim: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.35)' },
      }
    }
  },
  plugins: [],
}
export default config

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#FF5722",
        "primary-hover": "#E64A19",
        "background-light": "#F4F5F7",
        "background-dark": "#1F2124",
        "surface-light": "#FFFFFF",
        "surface-dark": "#2C2E33",
        "border-light": "#E0E0E0",
        "border-dark": "#3E4045",
        "text-light": "#333333",
        "text-dark": "#E0E0E0",
        "text-muted-light": "#757575",
        "text-muted-dark": "#9E9E9E",
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "8px",
        lg: "12px",
        xl: "16px",
        full: "9999px",
      },
    },
  },
  plugins: [],
}

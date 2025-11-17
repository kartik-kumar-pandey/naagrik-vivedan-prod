// API Configuration for different environments
const env = import.meta.env || {};
const DEFAULT_LOCAL_API = 'http://localhost:5000';
const DEFAULT_PROD_API = 'https://naagrik-nivedan.onrender.com';

const API_BASE_URL =
  env.VITE_API_BASE_URL ||
  env.REACT_APP_API_BASE_URL ||
  (env.MODE === 'production' ? DEFAULT_PROD_API : DEFAULT_LOCAL_API);

export { API_BASE_URL };

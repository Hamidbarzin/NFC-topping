module.exports = {
  apps: [
    {
      name: "nfc-api",
      script: "dist/index.js",
      cwd: "/www/wwwroot/New-Nfc_Topping-courier/artifacts/api-server",
      env: {
        NODE_ENV: "production",
        PORT: 8080,
        DATABASE_URL: "postgresql://topping_nfc_user:StrongPassword123!@localhost:5432/topping_nfc_db",
        CLOUDINARY_URL: "cloudinary://686631118763558:YOUR_REAL_SECRET@dqeqbomoo"
      }
    }
  ]
};

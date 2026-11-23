module.exports = function () {
  return {
    isProduction: process.env.CONTEXT === "production",
    year: new Date().getUTCFullYear()
  };
};